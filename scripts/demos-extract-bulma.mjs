// Demos page (plan 42): extract the text of each Bulma scene from the static demo the site itself serves (site/bulma/demo,
// the package of bulma-demo.lock), so every drawn panel reads exactly as the demo a reader opens. Serves the site with
// scripts/site-preview.mjs, and for each scene in site-src/demos-bulma.steps.json opens a fresh browser at the package's
// clock (BULMA_DEMO.clock) in Europe/London, opens the scene's page by its name in BULMA_DEMO.pages (ids change with every
// export, the page names do not), runs its steps and serialises its panel at 1440 and 375 wide (scripts/demos-serialise.mjs).
// A panel is a heading and what follows it up to the next heading of the same or a higher level, or a CSS selector.
// Use (after a new demo package is locked): node scripts/demos-extract-bulma.mjs, Prettier on site-src/demos-bulma.json,
// node scripts/build-demos.mjs, Prettier on site/demos/*.html, npm run site:check.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'
import { chromium } from '@playwright/test'
import { serialise } from './demos-serialise.mjs'

const DIR = 'site/bulma/demo'
const info = JSON.parse(readFileSync(`${DIR}/snapshot-info.json`, 'utf8'))
const box = {}
box.globalThis = box
vm.runInNewContext(readFileSync(`${DIR}/data/snapshot.js`, 'utf8'), box)
const demo = box.BULMA_DEMO
const pages = Object.fromEntries(demo.pages.map((p) => [p.n, p]))
const spec = JSON.parse(readFileSync('site-src/demos-bulma.steps.json', 'utf8'))
// a port of its own (never a preview another checkout is serving), and the served package must be this checkout's
const PORT = await new Promise((resolve) => {
  const probe = createServer().listen(0, () => {
    const { port } = probe.address()
    probe.close(() => resolve(port))
  })
})
const server = spawn('node', ['scripts/site-preview.mjs', String(PORT)], { stdio: 'ignore' })
server.on('exit', (code) => code && console.error(`site preview exited with ${code}`))
const base = `http://localhost:${PORT}/bulma/demo/`
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
  if (verb === 'click') await page.getByRole('button', { name: arg, exact: true }).first().click()
  // a field by the start of its label (Bulma's labels carry a hint after the name: "Amount (GBP)Minimum …")
  else if (verb === 'fill')
    await page
      .getByRole('textbox', { name: new RegExp('^' + arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      .first()
      .fill(value)
  else if (verb === 'open') {
    const summary = page.locator('summary').filter({ hasText: arg }).first()
    if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click()
  } else if (verb === 'wait') await page.getByText(arg, { exact: false }).first().waitFor()
  else throw new Error(`unknown step ${verb}`)
}

// the heading and its following siblings up to the next heading of the same or a higher level, serialised in the page
function section([text, level, skip]) {
  const rank = (el) => (/^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : 9)
  const head = [...document.querySelectorAll('main h1, main h2, main h3, main h4')].find((h) => h.innerText.replace(/\s+/g, ' ').trim() === text)
  if (!head) throw new Error(`no heading "${text}"`)
  const own = level ?? rank(head)
  // a heading alone in its wrapper (a card's title row) stands for the wrapper
  let start = head
  while (start.parentElement && start.parentElement.children.length === 1 && start.parentElement.tagName !== 'MAIN') start = start.parentElement
  const out = []
  for (let el = start.nextElementSibling; el; el = el.nextElementSibling) {
    // the next heading, bare or leading its own wrapper
    const h = /^H[1-6]$/.test(el.tagName) ? el : /^H[1-6]$/.test(el.firstElementChild?.tagName ?? '') ? el.firstElementChild : null
    if (h && rank(h) <= own) break
    out.push(el)
  }
  const lines = []
  // eslint-disable-next-line no-undef
  for (const el of out) lines.push(...window.__serialise(el))
  return skip ? lines.filter((l) => !skip.includes(Array.isArray(l) ? l[0] : l)) : lines
}

const browser = await chromium.launch()
// the steps and the code that reads them: a change to either calls for a new extraction (check-demos compares)
const EXTRACTION_FILES = ['site-src/demos-bulma.steps.json', 'scripts/demos-extract-bulma.mjs', 'scripts/demos-serialise.mjs']
const stepsHash = createHash('sha256')
  .update(EXTRACTION_FILES.map((f) => readFileSync(f, 'utf8')).join('\n'))
  .digest('hex')
const out = { bulma: info.commit, version: info.version, built: info.built_at, steps: stepsHash, clock: demo.clock, scenes: {} }
const failed = []
try {
  for (const [id, scene] of Object.entries(spec.scenes)) {
    const target = pages[scene.page]
    if (!target) {
      failed.push(`${id}: no page "${scene.page}" in the demo package`)
      continue
    }
    if (target.what !== scene.what) {
      failed.push(`${id}: page "${scene.page}" now shows "${target.what}", not "${scene.what}" (renumbered export: update the steps)`)
      continue
    }
    out.scenes[id] = { page: scene.page, view: target.view }
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: spec.timezone, locale: 'en-GB' })
      context.setDefaultTimeout(8000)
      const page = await context.newPage()
      await page.clock.setFixedTime(new Date(demo.clock))
      await page.addInitScript(`window.__serialise = ${serialise.toString()}`)
      await page.goto(base + `#/${target.view}${target.path}`)
      try {
        await page.locator('main h1, main h2').first().waitFor()
        for (const c of target.click ?? []) await act(page, ['click', c])
        for (const step of scene.steps ?? []) await act(page, step)
        const lines = []
        for (const panel of scene.panel) {
          if (panel.selector) {
            const loc = page.locator(panel.selector)
            await loc.first().waitFor()
            for (const el of await loc.all()) lines.push(...(await el.evaluate((e) => window.__serialise(e))))
          } else {
            await page.getByRole('heading', { name: panel.from, exact: true }).first().waitFor()
            lines.push(...(await page.evaluate(section, [panel.from, panel.level, panel.skip])))
          }
        }
        // Bulma sets a link's counts apart from its terms by layout, not a space ("No fee0 invited"): the drawn text separates them
        const gap = (t) => t.replace(/(\S)(\d+ invited, \d+ committed, )/g, '$1 · $2')
        for (let k = 0; k < lines.length; k++) lines[k] = Array.isArray(lines[k]) ? lines[k].map(gap) : gap(lines[k])
        const key = width === 1440 ? 'wide' : 'narrow'
        out.scenes[id][key] = lines
        if (key === 'wide' && scene.head)
          out.scenes[id].head = (await page.getByRole('heading', { name: scene.head, exact: true }).first().innerText()).replace(/\s+/g, ' ').trim()
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
writeFileSync('site-src/demos-bulma.json', JSON.stringify(out, null, 1) + '\n')
console.log(`demos-bulma.json: ${Object.keys(out.scenes).length} scenes from the Bulma ${info.version} demo package`)
