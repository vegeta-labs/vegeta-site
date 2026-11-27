// Tests for the /api/explore function (plan 44 §7). No model and no network: Redis and the model are stand-ins, except the
// limiter script, which runs against a real local redis-server when one is installed (skipped otherwise).
// Run: npm run test:explore
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { explore, readAnswer, clientKey, LIMIT_SCRIPT, LIMITS, SCHEMA } from '../site/api/explore.mjs'
import catalog from '../site/api/_catalog.mjs'

const ORIGIN = 'https://vegeta-ops.vercel.app'
const headers = (extra = {}) =>
  new Headers({
    'content-type': 'application/json',
    'sec-fetch-site': 'same-origin',
    origin: ORIGIN,
    'x-vercel-forwarded-for': '203.0.113.7',
    ...extra,
  })
const env = { EXPLORE_IP_KEY: 'test-secret', EXPLORE_MODEL: 'test/model' }
const okRedis = async (cmd) => (cmd[0] === 'GET' ? null : 0)
const answer = (a) => async () => JSON.stringify(a)
const run = (over = {}) =>
  explore({
    method: 'POST',
    headers: headers(),
    bodyText: JSON.stringify({ q: 'I need to split exit proceeds between investors' }),
    env,
    redis: okRedis,
    callModel: answer({ state: 'pages', ids: ['goten'] }),
    ...over,
  })

test('a good request gets catalog ids', async () => {
  assert.deepEqual(await run(), { status: 200, body: { state: 'pages', ids: ['goten'] } })
})

test('requests that are not this page, in this form, are refused before anything else', async () => {
  let touched = false
  const redis = async () => {
    touched = true
    return 0
  }
  for (const over of [
    { method: 'GET' },
    { headers: headers({ origin: 'https://evil.example' }) },
    { headers: headers({ origin: 'null' }) },
    { headers: headers({ 'sec-fetch-site': 'cross-site' }) },
    { headers: headers({ 'content-type': 'text/plain' }) },
    { bodyText: 'x'.repeat(3000) },
    { bodyText: 'not json' },
    { bodyText: JSON.stringify({ q: 'a' }) },
    { bodyText: JSON.stringify({ q: 'a'.repeat(301) }) },
    { bodyText: JSON.stringify({ q: 42 }) },
  ]) {
    const r = await run({ ...over, redis })
    assert.equal(r.body.state, 'invalid', JSON.stringify(over).slice(0, 80))
  }
  assert.equal(touched, false)
})

test('an extra origin is allowed only when configured', async () => {
  const h = headers({ origin: 'http://localhost:4181' })
  assert.equal((await run({ headers: h })).body.state, 'invalid')
  assert.equal((await run({ headers: h, env: { ...env, EXPLORE_ORIGINS: 'http://localhost:4181' } })).body.state, 'pages')
})

test('the kill switch stops it, and an unreadable switch counts as off', async () => {
  let called = false
  const callModel = async () => {
    called = true
    return '{}'
  }
  assert.equal((await run({ redis: async (c) => (c[0] === 'GET' ? '1' : 0), callModel })).body.state, 'paused')
  assert.equal(
    (
      await run({
        redis: async () => {
          throw new Error('down')
        },
        callModel,
      })
    ).body.state,
    'paused',
  )
  assert.equal(called, false)
})

test('limits: the visitor or the site minute says wait, the visitor day says tomorrow; any other limit or an odd reply pauses; the model is not called', async () => {
  let called = false
  const callModel = async () => {
    called = true
    return '{}'
  }
  const limiter = (v) => async (c) => (c[0] === 'GET' ? null : v)
  assert.deepEqual((await run({ redis: limiter(1), callModel })).body, { state: 'limit' })
  assert.deepEqual((await run({ redis: limiter(2), callModel })).body, { state: 'daily' })
  assert.deepEqual((await run({ redis: limiter(3), callModel })).body, { state: 'limit' })
  for (const v of [4, 5, null, 'x']) assert.equal((await run({ redis: limiter(v), callModel })).body.state, 'paused')
  assert.equal(called, false)
})

test('the limiter counts the visitor (minute, then day) first, then the site minute, day and month, with their lifetimes and maxima', async () => {
  let cmd
  await run({ redis: async (c) => (c[0] === 'EVAL' ? ((cmd = c), 0) : null), now: new Date('2026-11-26T21:05:09Z') })
  assert.equal(cmd[1], LIMIT_SCRIPT)
  assert.equal(cmd[2], '5')
  const keys = cmd.slice(3, 8)
  assert.match(keys[0], /^explore:ip:[0-9a-f]{24}$/)
  assert.match(keys[1], /^explore:ipd:[0-9a-f]{24}:2026-11-26$/)
  assert.deepEqual(keys.slice(2), ['explore:m:2026-11-26T21:05', 'explore:d:2026-11-26', 'explore:mo:2026-11'])
  assert.deepEqual(cmd.slice(8), [...LIMITS.map((l) => String(l[1])), ...LIMITS.map((l) => String(l[2]))])
  assert.ok(!cmd.join(' ').includes('203.0.113.7'), 'no raw address is sent to Redis')
})

test('no address key, no model setting or a failing model: paused', async () => {
  assert.equal((await run({ env: { EXPLORE_MODEL: 'm' } })).body.state, 'paused')
  assert.equal((await run({ env: { EXPLORE_IP_KEY: 'k' } })).body.state, 'paused')
  assert.equal((await run({ headers: headers({ 'x-vercel-forwarded-for': '' }) })).body.state, 'paused')
  for (const status of [402, 403, 429, 500, 'TimeoutError'])
    assert.equal(
      (
        await run({
          callModel: async () => {
            throw Object.assign(new Error('x'), { status })
          },
        })
      ).body.state,
      'paused',
    )
})

test('the visitor text is never logged', async () => {
  const q = 'my name is Jane Example and my deal is Secret Robotics'
  const lines = []
  const saved = { log: console.log, error: console.error, warn: console.warn, info: console.info }
  for (const k of Object.keys(saved)) console[k] = (...a) => lines.push(a.join(' '))
  try {
    const bodyText = JSON.stringify({ q })
    await run({ bodyText })
    await run({
      bodyText,
      redis: async () => {
        throw new Error(q)
      },
    })
    await run({
      bodyText,
      callModel: async () => {
        throw new Error(q)
      },
    })
    await run({ bodyText, callModel: async () => q })
  } finally {
    Object.assign(console, saved)
  }
  assert.ok(!lines.join('\n').includes('Jane'), lines.join('\n'))
})

test('the model request: catalog ids only, strict schema, short, no prompt training', async () => {
  let body
  await run({
    callModel: async (b) => {
      body = b
      return '{"state":"none","ids":[]}'
    },
  })
  assert.equal(body.response_format.json_schema.strict, true)
  assert.deepEqual(body.response_format.json_schema.schema, SCHEMA)
  assert.deepEqual(
    SCHEMA.properties.ids.items.enum,
    catalog.entries.map((e) => e.id),
  )
  assert.ok(body.max_tokens <= 240)
  assert.equal(body.temperature, undefined)
  assert.equal(body.providerOptions.gateway.disallowPromptTraining, true)
  assert.equal(body.messages[1].content, 'I need to split exit proceeds between investors')
})

test('reading the answer: suitability wins, ids count only for pages, unknown and repeated ids drop, five at most', () => {
  assert.deepEqual(readAnswer('{"state":"suitability","ids":["goten"]}'), { state: 'suitability' })
  assert.deepEqual(readAnswer('{"state":"pages","ids":["goten","suitability"]}'), { state: 'suitability' })
  // Codex code round: suitability in another key, or in a duplicate key that JSON.parse would drop
  assert.deepEqual(readAnswer('{"state":"pages","ids":["goten"],"other":"suitability"}'), { state: 'suitability' })
  assert.deepEqual(readAnswer('{"state":"suitability","state":"pages","ids":["goten"]}'), { state: 'suitability' })
  assert.deepEqual(readAnswer('{"state":"pages","ids":["goten"],"extra":1}'), { state: 'busy' })
  assert.deepEqual(readAnswer('{"state":"pages","ids":"goten"}'), { state: 'busy' })
  assert.deepEqual(readAnswer('{"state":"none","ids":["goten"]}'), { state: 'none' })
  assert.deepEqual(readAnswer('{"state":"pages","ids":["nope","goten","goten"]}'), { state: 'pages', ids: ['goten'] })
  assert.deepEqual(readAnswer('{"state":"pages","ids":["nope"]}'), { state: 'none' })
  const six = catalog.entries.slice(0, 6).map((e) => e.id)
  assert.equal(readAnswer(JSON.stringify({ state: 'pages', ids: six })).ids.length, 5)
  for (const bad of ['', 'null', '[]', '{"state":"other","ids":[]}', 'Sure! Here are some pages']) assert.deepEqual(readAnswer(bad), { state: 'busy' }, bad)
})

test('reading the answer: a section counts only for an article in the answer, only one of its own, the first per article', () => {
  const art = catalog.entries.find((e) => e.sections)
  const [s1, s2] = art.sections.map(([s]) => s)
  const other = catalog.entries.find((e) => e.sections && e.id !== art.id)
  const read = (sections, ids = [art.id, 'goten']) => readAnswer(JSON.stringify({ state: 'pages', ids, sections }))
  assert.deepEqual(read([`${art.id}#${s1}`]), { state: 'pages', ids: [art.id, 'goten'], sections: { [art.id]: s1 } })
  assert.deepEqual(read([`${art.id}#${s2}`, `${art.id}#${s1}`]).sections, { [art.id]: s2 })
  assert.deepEqual(read([`${art.id}#nope`, `goten#${s1}`, `${other.id}#${other.sections[0][0]}`, `${art.id}#${s1}#x`, 7]), {
    state: 'pages',
    ids: [art.id, 'goten'],
  })
  assert.deepEqual(read([]), { state: 'pages', ids: [art.id, 'goten'] })
  assert.deepEqual(readAnswer('{"state":"pages","ids":["goten"],"sections":"x"}'), { state: 'busy' })
  assert.deepEqual(readAnswer('{"state":"none","ids":[],"sections":[]}'), { state: 'none' })
})

test('the deployment switch EXPLORE_ENABLED=0 pauses before anything else', async () => {
  let touched = false
  const r = await run({ env: { ...env, EXPLORE_ENABLED: '0' }, redis: async () => ((touched = true), 0) })
  assert.equal(r.body.state, 'paused')
  assert.equal(touched, false)
})

test('reasoning models get no temperature and room for their reasoning', async () => {
  let body
  await run({
    env: { ...env, EXPLORE_MODEL: 'openai/gpt-5.4-nano' },
    callModel: async (b) => ((body = b), '{"state":"none","ids":[]}'),
  })
  assert.equal(body.temperature, undefined)
  assert.equal(body.max_tokens, undefined)
  assert.equal(body.reasoning_effort, 'minimal')
})

test('the address key: keyed, the same for one IPv6 /64, different across addresses', () => {
  const h = (ip) => new Headers({ 'x-vercel-forwarded-for': ip })
  const a = clientKey(h('2001:db8:1:2:aaaa::1'), 's')
  assert.equal(a, clientKey(h('2001:db8:1:2:bbbb:cccc:dddd:eeee'), 's'))
  assert.notEqual(a, clientKey(h('2001:db8:1:3::1'), 's'))
  assert.notEqual(clientKey(h('203.0.113.7'), 's'), clientKey(h('203.0.113.8'), 's'))
  assert.notEqual(clientKey(h('203.0.113.7'), 's'), clientKey(h('203.0.113.7'), 't'))
  assert.equal(clientKey(h('::ffff:203.0.113.7'), 's'), clientKey(h('203.0.113.7'), 's'))
  assert.notEqual(clientKey(h('::ffff:203.0.113.7'), 's'), clientKey(h('::ffff:203.0.113.8'), 's'))
  assert.equal(clientKey(h('2001:0db8:0001:0002::1'), 's'), a)
  assert.equal(clientKey(h('203.0.113.7'), ''), null)
  assert.equal(clientKey(new Headers(), 's'), null)
})

// the Lua script against a real Redis: a new key gets its lifetime in the same step, and no key is ever left without one
const redisBin = ['/usr/bin/redis-server', '/usr/local/bin/redis-server'].find(existsSync)
test('limiter script on a real Redis', { skip: !redisBin && 'redis-server not installed' }, async (t) => {
  // a private socket in a fresh directory, no TCP port: nothing else can answer
  const sock = join(mkdtempSync(join(tmpdir(), 'explore-redis-')), 'r.sock')
  const server = spawn(redisBin, ['--port', '0', '--unixsocket', sock, '--save', '', '--appendonly', 'no'], { stdio: 'ignore' })
  t.after(() => server.kill())
  const cli = (...a) => execFileSync('redis-cli', ['-s', sock, '--raw', ...a], { encoding: 'utf8' }).trim()
  const ping = () => {
    try {
      return cli('PING')
    } catch {
      return ''
    }
  }
  for (let i = 0; i < 100 && ping() !== 'PONG'; i++) await new Promise((r) => setTimeout(r, 50))
  const evalLimit = (keys, ttl, max) => Number(cli('EVAL', LIMIT_SCRIPT, String(keys.length), ...keys, ...ttl.map(String), ...max.map(String)))
  // the visitor's own limit stops them before the site-wide counters move
  for (let i = 0; i < 5; i++) assert.equal(evalLimit(['v', 'g'], [60, 60], [5, 10]), 0)
  assert.equal(evalLimit(['v', 'g'], [60, 60], [5, 10]), 1)
  assert.equal(cli('GET', 'g'), '5')
  // the second counter's limit
  assert.equal(evalLimit(['w', 'g'], [60, 60], [5, 5]), 2)
  // every key has a lifetime, at its first count and after
  for (const k of ['v', 'w', 'g']) assert.ok(Number(cli('TTL', k)) > 0, k)
  // a key that expires is created again with a lifetime (the race a separate INCR then EXPIRE leaves open)
  cli('SET', 'x', '3', 'PX', '20')
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(evalLimit(['x'], [60], [5]), 0)
  assert.equal(cli('GET', 'x'), '1')
  assert.ok(Number(cli('TTL', 'x')) > 0)
  // many at once: exactly the limit gets through
  const results = await Promise.all(
    Array.from(
      { length: 20 },
      () =>
        new Promise((resolve) => {
          const p = spawn('redis-cli', ['-s', sock, '--raw', 'EVAL', LIMIT_SCRIPT, '1', 'burst', '60', '7'])
          let out = ''
          p.stdout.on('data', (d) => (out += d))
          p.on('close', () => resolve(Number(out.trim())))
        }),
    ),
  )
  assert.equal(results.filter((r) => r === 0).length, 7)
})

// the evaluator itself (Codex code round): a wrong state fails even when the case lists no ids
test('the evaluator fails a wrong state, with or without expected ids', () => {
  const dir = mkdtempSync(join(tmpdir(), 'explore-eval-'))
  const evalRun = (set, answers) => {
    writeFileSync(join(dir, 'set.json'), JSON.stringify(set))
    writeFileSync(join(dir, 'stub.json'), JSON.stringify(answers))
    try {
      execFileSync('node', ['scripts/eval-explore.mjs', join(dir, 'set.json'), `--stub=${join(dir, 'stub.json')}`], { stdio: 'pipe' })
      return 0
    } catch (e) {
      return e.status
    }
  }
  const pages = JSON.stringify({ state: 'pages', ids: ['goten'] })
  const none = JSON.stringify({ state: 'none', ids: [] })
  assert.equal(evalRun([{ q: 'weather in London', expect: 'none' }], { 'weather in London': pages }), 1)
  assert.equal(evalRun([{ q: 'how does EIS work', expect: 'pages' }], { 'how does EIS work': none }), 1)
  assert.equal(evalRun([{ q: 'how does EIS work', expect: 'pages' }], { 'how does EIS work': pages }), 0)
  assert.equal(evalRun([{ q: 'should I invest', expect: 'suitability' }], { 'should I invest': pages }), 1)
})
