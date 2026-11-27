// Scores the /api/explore decision on a question set (plan 44 §7). Costs model credit unless --mock.
//   node scripts/eval-explore.mjs site-src/explore-eval-dev.json --mock     dry run of the scoring with the offline stand-in
//   node scripts/eval-explore.mjs <set.json> --stub=<answers.json>   the scoring itself, with fixed answers
//   EXPLORE_MODEL=… AI_GATEWAY_API_KEY=… node scripts/eval-explore.mjs <set.json> [--gap=7000]   the real model, no Redis (limits are not tested here)
// A set is a JSON array of { q, expect: "suitability" | "pages" | "none", ids?: [catalog ids, any one counts as a hit] }.
// Pass: every question gets its expected state (suitability, pages or none) — a wrong state always fails; and "pages" questions
// that list ids hit at least the share given by --hit (default 0.8). Prints each miss and exits 1 on a fail.
import { readFileSync } from 'node:fs'
import { explore, gateway, mock } from '../site/api/explore.mjs'

const [file, ...flags] = process.argv.slice(2)
const useMock = flags.includes('--mock')
const hitNeeded = Number(flags.find((f) => f.startsWith('--hit='))?.slice(6) ?? 0.8)
// --gap=<ms>: wait between questions (the AI Gateway free tier allows only a few requests a minute)
const gap = Number(flags.find((f) => f.startsWith('--gap='))?.slice(6) ?? 0)
const set = JSON.parse(readFileSync(file, 'utf8'))
const ORIGIN = 'https://vegeta-ops.vercel.app'
const headers = new Headers({ 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', origin: ORIGIN, 'x-vercel-forwarded-for': '192.0.2.1' })
// --stub=<file.json>: answers per question ({ q: raw model text }), to test the scoring itself (scripts/explore.test.mjs)
const stubFile = flags.find((f) => f.startsWith('--stub='))?.slice(7)
const stub = stubFile && JSON.parse(readFileSync(stubFile, 'utf8'))
const deps = stub
  ? {
      redis: async (c) => (c[0] === 'GET' ? null : 0),
      callModel: async (b) => stub[b.messages[1].content] ?? '',
      env: { EXPLORE_MODEL: 'stub', EXPLORE_IP_KEY: 'eval' },
    }
  : useMock
    ? { ...mock(), env: { EXPLORE_MODEL: 'mock', EXPLORE_IP_KEY: 'eval' } }
    : { redis: async (c) => (c[0] === 'GET' ? null : 0), callModel: gateway(process.env.AI_GATEWAY_API_KEY), env: { ...process.env, EXPLORE_IP_KEY: 'eval' } }

const misses = []
let suitWrong = 0
let falseSuit = 0
let wrongState = 0
let hits = 0
let scored = 0
for (const [i, item] of set.entries()) {
  if (gap && i) await new Promise((r) => setTimeout(r, gap))
  const { body } = await explore({ method: 'POST', headers, bodyText: JSON.stringify({ q: item.q }), ...deps })
  const got = body.state
  if (got === 'paused') {
    console.error(`#${i + 1}: paused (no answer from the model): stopping`)
    process.exit(2)
  }
  if (item.expect === 'suitability' && got !== 'suitability') {
    suitWrong++
    misses.push(`#${i + 1} wanted suitability, got ${got}: ${item.q}`)
  }
  if (item.expect !== 'suitability' && got === 'suitability') {
    falseSuit++
    misses.push(`#${i + 1} got suitability, wanted ${item.expect}: ${item.q}`)
  }
  if (!['suitability', 'pages', 'none'].includes(item.expect)) {
    console.error(`#${i + 1}: expect must be suitability, pages or none`)
    process.exit(2)
  }
  // every case: the state itself (Codex code round: a set without ids must still fail on a wrong state)
  if (item.expect !== 'suitability' && got !== 'suitability' && got !== item.expect) {
    wrongState++
    misses.push(`#${i + 1} wanted ${item.expect}, got ${got}: ${item.q}`)
  }
  if (item.expect === 'pages' && item.ids?.length) {
    scored++
    if (got === 'pages' && body.ids.some((id) => item.ids.includes(id))) hits++
    else misses.push(`#${i + 1} no expected page (${item.ids.join(', ')}); got ${got} ${body.ids?.join(', ') ?? ''}: ${item.q}`)
  }
}
const share = scored ? hits / scored : 1
const pass = suitWrong === 0 && falseSuit === 0 && wrongState === 0 && share >= hitNeeded
console.log(
  `${file}${useMock ? ' (mock)' : ''}: ${set.length} questions; suitability missed ${suitWrong}, wrongly given ${falseSuit}; other wrong states ${wrongState}; page hits ${hits}/${scored}; ${pass ? 'PASS' : 'FAIL'}`,
)
for (const m of misses) console.log('  ' + m)
process.exit(pass ? 0 : 1)
