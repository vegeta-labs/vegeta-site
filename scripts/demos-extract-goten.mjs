// Demos page (plan 42, brief v3 §2.7): extract the text of each Goten scene from the real app.
// Builds Goten from vendor/goten (git archive of its HEAD into a temp dir, npm ci, vite build), serves it, and for each
// scene in site-src/demos-goten.steps.json starts from a fresh browser profile with a fixed clock, performs the steps
// and serialises the scene's panel and heading at 1440 and 375 wide: tables and dt/dd pairs as cells, inputs as ⟦value⟧,
// ticks as ☑ ☐, buttons as ‹label›, Goten's inline badges and pills as «text».
// Normal use (after each Goten release, with vendor/goten at goten.ref): node scripts/demos-extract-goten.mjs, Prettier on
// site-src/demos-goten.json, node scripts/build-demos.mjs, Prettier on site/demos/index.html, npm run site:check.
// DEMOS_COMPARE=1 (the daily Product drift workflow, vendor/goten at Goten's latest main): extract, compare the scenes with
// the committed site-src/demos-goten.json and fail when the app shows anything different; nothing is written.
// GOTEN_URL=http://localhost:4799 skips the build and uses an already served copy of the same commit.
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { chromium } from '@playwright/test'
import { serialise } from './demos-serialise.mjs'

const GOTEN = process.env.GOTEN_DIR ?? 'vendor/goten'
const COMPARE = process.env.DEMOS_COMPARE === '1'
const ref = readFileSync('goten.ref', 'utf8').trim()
const head = execFileSync('git', ['-C', GOTEN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (!COMPARE && head !== ref) throw new Error(`${GOTEN} is at ${head}, goten.ref is ${ref}: run npm run goten:fetch`)
const spec = JSON.parse(readFileSync('site-src/demos-goten.steps.json', 'utf8'))
const CLOCK = new Date(spec.clock)

let server
let base = process.env.GOTEN_URL
let scratch
if (!base) {
  scratch = mkdtempSync(join(tmpdir(), 'demos-goten-'))
  execFileSync('sh', ['-c', `git -C "${GOTEN}" archive --format=tar ${head} | tar -x -C "${scratch}"`])
  execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: scratch, stdio: 'ignore' })
  execFileSync('npm', ['run', 'build'], { cwd: scratch, stdio: 'ignore' })
  // a port of its own, and the page served there must be this build's (never another checkout's preview)
  const port = await new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: scratch, stdio: 'ignore' })
  let exited = null
  server.on('exit', (code) => (exited = code))
  base = `http://localhost:${port}`
  const built = readFileSync(join(scratch, 'dist/index.html'), 'utf8')
  let served = null
  for (let i = 0; i < 75 && served === null && exited === null; i++) {
    try {
      const r = await fetch(base + '/')
      if (r.ok) served = await r.text()
    } catch {}
    if (served === null) await new Promise((r) => setTimeout(r, 200))
  }
  if (served !== built) {
    server.kill()
    rmSync(scratch, { recursive: true, force: true })
    throw new Error(`the Goten preview on port ${port} did not start or does not serve this build${exited !== null ? ` (exited ${exited})` : ''}`)
  }
}

async function panelLines(page, panel) {
  const all = []
  for (const selector of panel.selectors ?? [panel.selector]) {
    const loc = page.locator(selector).first()
    await loc.waitFor()
    all.push(...(await loc.evaluate(serialise)))
  }
  return all
}

async function act(page, step) {
  const [verb, arg, value] = step
  const target = (a) => {
    if (typeof a === 'string') return page.getByRole('button', { name: a, exact: true })
    if (a.tab) return page.getByRole('tab', { name: new RegExp(a.tab) })
    if (a.label) return page.getByLabel(a.label, { exact: true })
    if (a.selector) return page.locator(a.selector)
    throw new Error(`bad target ${JSON.stringify(a)}`)
  }
  if (verb === 'click') await target(arg).first().click()
  else if (verb === 'fill') {
    const t = target(arg).first()
    await t.fill(value)
    await t.press('Enter')
  } else if (verb === 'paste') await target(arg).first().fill(value)
  else if (verb === 'select') await target(arg).first().selectOption({ label: value })
  else if (verb === 'check') await target(arg).first().check()
  else if (verb === 'open') {
    const summary = page.locator('summary').filter({ hasText: arg }).first()
    if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click()
  } else if (verb === 'wait') await page.getByText(arg, { exact: false }).first().waitFor()
  else throw new Error(`unknown step ${verb}`)
}

const browser = await chromium.launch()
// the steps and the code that reads them: a change to either calls for a new extraction (check-demos compares)
const EXTRACTION_FILES = ['site-src/demos-goten.steps.json', 'scripts/demos-extract-goten.mjs', 'scripts/demos-serialise.mjs']
const stepsHash = createHash('sha256')
  .update(EXTRACTION_FILES.map((f) => readFileSync(f, 'utf8')).join('\n'))
  .digest('hex')
const out = { goten: head, steps: stepsHash, clock: spec.clock, controls: [], scenes: {} }
const failed = []
try {
  for (const [id, scene] of Object.entries(spec.scenes)) {
    out.scenes[id] = { state: scene.state }
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: spec.timezone, locale: 'en-GB' })
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
      context.setDefaultTimeout(8000)
      const page = await context.newPage()
      await page.clock.setFixedTime(CLOCK)
      await page.goto(base + '/')
      try {
        for (const step of [...(spec.prelude[scene.prelude] ?? []), ...scene.steps]) await act(page, step)
        const key = width === 1440 ? 'wide' : 'narrow'
        out.scenes[id][key] = await panelLines(page, scene.panel)
        if (key === 'wide' && scene.head) out.scenes[id].head = (await page.locator(scene.head).first().innerText()).replace(/\s+/g, ' ').trim()
      } catch (e) {
        failed.push(`${id} at ${width}: ${e.message.split('\n')[0]}`)
      }
      await context.close()
    }
  }
  // the app's own visible controls (buttons, links, tabs) on first open and with the sample loaded: a try-it path may name
  // only these or what a scene shows
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: spec.timezone, locale: 'en-GB' })
  const page = await context.newPage()
  await page.clock.setFixedTime(CLOCK)
  await page.goto(base + '/')
  const controls = new Set()
  const read = async () => {
    for (const t of await page.locator('button:visible, a:visible, [role=tab]:visible, summary:visible').allInnerTexts()) {
      const v = t.replace(/\s+/g, ' ').trim()
      if (v) controls.add(v)
    }
  }
  await read()
  for (const step of spec.prelude.loaded) await act(page, step)
  await read()
  out.controls = [...controls].sort()
  await context.close()
} finally {
  await browser.close()
  server?.kill()
  if (scratch) rmSync(scratch, { recursive: true, force: true })
}
if (process.env.DEMOS_DEBUG) writeFileSync(process.env.DEMOS_DEBUG, JSON.stringify(out, null, 1))
if (failed.length) {
  console.error(failed.join('\n'))
  process.exit(1)
}
if (COMPARE) {
  const committed = JSON.parse(readFileSync('site-src/demos-goten.json', 'utf8'))
  const changed = Object.keys({ ...committed.scenes, ...out.scenes }).filter((id) => JSON.stringify(committed.scenes[id]) !== JSON.stringify(out.scenes[id]))
  if (JSON.stringify(committed.controls) !== JSON.stringify(out.controls)) changed.push("(the app's controls)")
  if (changed.length) {
    console.error(`Goten ${head.slice(0, 7)} shows different text in Demos scenes ${changed.join(', ')}: rerun the extraction at the new pin`)
    process.exit(1)
  }
  console.log(`Demos scenes unchanged at Goten ${head.slice(0, 7)}`)
} else {
  writeFileSync('site-src/demos-goten.json', JSON.stringify(out, null, 1) + '\n')
  console.log(`demos-goten.json: ${Object.keys(out.scenes).length} scenes at Goten ${ref.slice(0, 7)}`)
}
