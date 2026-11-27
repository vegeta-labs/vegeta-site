// Demos page (plan 42, brief v3.1): extract the text of each Trunks scene from the static demo the site itself serves
// (site/trunks/demo, the locked v0.5.0 package of trunks-demo.lock), so every drawn panel reads exactly as the demo a
// reader opens. Serves the site with scripts/site-preview.mjs, and for each scene in site-src/demos-trunks.steps.json opens
// a fresh browser at the fixed clock and time zone, opens the scene's case (#case=…) or the list, runs its steps and
// serialises its panel and heading at 1440 and 375 wide (scripts/demos-serialise.mjs).
// Use (after a new demo package is locked): node scripts/demos-extract-trunks.mjs, Prettier on site-src/demos-trunks.json,
// node scripts/build-demos.mjs, Prettier on site/demos/index.html, npm run site:check.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { serialise } from './demos-serialise.mjs'

const info = JSON.parse(readFileSync('site/trunks/demo/snapshot-info.json', 'utf8'))
const spec = JSON.parse(readFileSync('site-src/demos-trunks.steps.json', 'utf8'))
// a port of its own (never a preview another checkout is serving), and the served package must be this checkout's
const PORT = await new Promise((resolve) => {
  const probe = createServer().listen(0, () => {
    const { port } = probe.address()
    probe.close(() => resolve(port))
  })
})
const server = spawn('node', ['scripts/site-preview.mjs', String(PORT)], { stdio: 'ignore' })
server.on('exit', (code) => code && console.error(`site preview exited with ${code}`))
const base = `http://localhost:${PORT}/trunks/demo/`
let served = null
for (let i = 0; i < 50 && !served; i++) {
  try {
    const r = await fetch(base + 'snapshot-info.json')
    if (r.ok) served = await r.json()
  } catch {}
  if (!served) await new Promise((r) => setTimeout(r, 200))
}
if (served?.commit !== info.commit || served?.built_at !== info.built_at) {
  server.kill()
  throw new Error(`the preview on port ${PORT} does not serve this checkout's demo package`)
}

async function act(page, [verb, arg, value]) {
  if (verb === 'select') await page.getByLabel(arg, { exact: true }).selectOption({ label: value })
  else if (verb === 'open') {
    const summary = page.locator('summary').filter({ hasText: arg }).first()
    if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click()
  } else if (verb === 'wait') await page.getByText(arg, { exact: false }).first().waitFor()
  // a demo-only label (the static demo's own wording, never drawn on the site) is taken out before the panel is read
  else if (verb === 'hide')
    await page
      .getByText(arg, { exact: true })
      .first()
      .evaluate((el) => (el.hidden = true))
  else throw new Error(`unknown step ${verb}`)
}

const browser = await chromium.launch()
// the package build and the steps it was read with, so a rebuilt package or changed steps call for a new extraction
// the steps and the code that reads them: a change to either calls for a new extraction (check-demos compares)
const EXTRACTION_FILES = ['site-src/demos-trunks.steps.json', 'scripts/demos-extract-trunks.mjs', 'scripts/demos-serialise.mjs']
const stepsHash = createHash('sha256')
  .update(EXTRACTION_FILES.map((f) => readFileSync(f, 'utf8')).join('\n'))
  .digest('hex')
const out = { trunks: info.commit, version: info.version, built: info.built_at, steps: stepsHash, clock: spec.clock, scenes: {} }
const failed = []
try {
  for (const [id, scene] of Object.entries(spec.scenes)) {
    out.scenes[id] = { case: scene.open || null }
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: spec.timezone, locale: 'en-GB' })
      context.setDefaultTimeout(8000)
      const page = await context.newPage()
      await page.clock.setFixedTime(new Date(spec.clock))
      await page.goto(base + (scene.open ? `#case=${scene.open}` : ''))
      try {
        await page
          .locator(scene.open ? '#case-title' : 'main > section h2')
          .first()
          .waitFor()
        for (const step of scene.steps) await act(page, step)
        const lines = []
        for (const selector of scene.panel.selectors ?? [scene.panel.selector]) {
          const loc = page.locator(selector)
          await loc.first().waitFor()
          for (const el of await loc.all()) lines.push(...(await el.evaluate(serialise)))
        }
        // Trunks sets a note in brackets apart by a margin, not a space ("Bank details (rule)"): the drawn text keeps the gap
        const gap = (t) => t.replace(/(\S)\((rule\)|several values|low confidence|needs confirmation|not in the ledger)/g, '$1 ($2')
        for (let k = 0; k < lines.length; k++) lines[k] = Array.isArray(lines[k]) ? lines[k].map(gap) : gap(lines[k])
        const key = width === 1440 ? 'wide' : 'narrow'
        out.scenes[id][key] = lines
        if (key === 'wide') out.scenes[id].head = (await page.locator(scene.head).first().innerText()).replace(/\s+/g, ' ').trim()
      } catch (e) {
        failed.push(`${id} at ${width}: ${e.message.split('\n')[0]}`)
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
if (failed.length) {
  console.error(failed.join('\n'))
  process.exit(1)
}
writeFileSync('site-src/demos-trunks.json', JSON.stringify(out, null, 1) + '\n')
console.log(`demos-trunks.json: ${Object.keys(out.scenes).length} scenes from the Trunks ${info.version} demo package`)
