// Site handbook §8 (docs/en/SITE_HANDBOOK.md): screenshots of every page at desktop (light, dark), a small laptop, phone and
// reduced motion, plus console/CSP errors, page width at phone sizes and the nav at every width from 761 to 1200 px.
// Usage: node scripts/site-preview.mjs 4181 & then node scripts/site-shots.mjs <out-dir> [baseURL]
import { chromium } from '@playwright/test'
const out = process.argv[2]
const BASE = process.argv[3] ?? 'http://localhost:4181'
const b = await chromium.launch()
const errs = []
async function run(name, path, opts, steps) {
  const p = await b.newPage(opts)
  p.on('console', (m) => m.type() === 'error' && errs.push(name + ': ' + m.text()))
  p.on('pageerror', (e) => errs.push(name + ': ' + e.message))
  await p.goto(BASE + path)
  await p.waitForTimeout(2200)
  for (const [label, fn] of steps) {
    await fn(p)
    await p.waitForTimeout(900)
    await p.screenshot({ path: `${out}/${name}-${label}.png` })
  }
  const m = await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, w: innerWidth, url: location.pathname + location.hash }))
  console.log(name, JSON.stringify(m))
  await p.close()
}
const deckAt = (k) => async (p) =>
  p.evaluate((k) => {
    const d = document.querySelector('[data-deck]')
    const top = d.getBoundingClientRect().top + scrollY
    scrollTo(0, top + (d.offsetHeight - innerHeight) * k)
  }, k)
const at = (sel) => async (p) => p.evaluate((s) => document.querySelector(s).scrollIntoView(), sel)
const bottom = async (p) => p.evaluate(() => scrollTo(0, document.body.scrollHeight))
const DESK = { viewport: { width: 1440, height: 900 }, colorScheme: 'light' }
const DARK = { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }
const SHORT = { viewport: { width: 1261, height: 657 }, colorScheme: 'light' }
const PHONE = { viewport: { width: 375, height: 812 }, colorScheme: 'light', deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const REDUCED = { viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' }
const hero = ['hero', async () => {}]

// / (overview)
const home = [
  hero,
  ['show', at('[data-scene]')],
  ['modules', at('#modules')],
  ['fits', at('#fits')],
  ['build', at('#build')],
  ['faq', at('#faq')],
  ['footer', bottom],
]
await run('home-light', '/', DESK, home)
await run('home-dark', '/', DARK, home.slice(0, 3))
await run('home-short', '/', SHORT, home.slice(0, 2))
await run('home-phone', '/', PHONE, [hero, ['scene', at('[data-scene]')], ['modules', at('#modules')], ['menu', async (p) => p.click('.nav__menu > summary')]])
// /toolkit/ (the accepted page, moved): the same frames as before the move
const deck3 = [hero, ['show', at('[data-scene]')], ['deck0', deckAt(0)], ['deck50', deckAt(0.5)], ['deck100', deckAt(1)], ['footer', bottom]]
await run('toolkit-light', '/toolkit/', DESK, deck3)
await run('toolkit-dark', '/toolkit/', DARK, deck3.slice(0, 3))
await run('toolkit-phone', '/toolkit/', PHONE, [hero, ['steps', at('#step-1')]])
// /inbox/
const inbox = [
  hero,
  ['show', at('[data-scene]')],
  ['problem', at('#problem')],
  ['deck0', deckAt(0)],
  ['deck33', deckAt(0.33)],
  ['deck66', deckAt(0.66)],
  ['deck100', deckAt(1)],
  ['trust', at('#trust')],
  ['cases', at('#cases')],
  ['bank', at('#case-bank')],
  ['security', at('#security')],
  ['setup', at('#setup')],
  ['faq', at('#faq')],
  ['footer', bottom],
]
await run('inbox-light', '/inbox/', DESK, inbox)
await run('inbox-dark', '/inbox/', DARK, [hero, ['show', at('[data-scene]')], ['deck33', deckAt(0.33)], ['trust', at('#trust')], ['cases', at('#cases')]])
await run('inbox-short', '/inbox/', SHORT, [hero, ['deck0', deckAt(0)], ['deck100', deckAt(1)]])
await run('inbox-phone', '/inbox/', PHONE, [
  hero,
  ['scene', at('[data-scene]')],
  ['steps', at('#step-1')],
  ['cases', at('#case-bank')],
  ['menu', async (p) => p.click('.nav__menu > summary')],
])
await run('inbox-reduced', '/inbox/', REDUCED, [['deck', at('#step-1')]])
await run('inbox-faqlink', '/inbox/#ifaq-kyc', DESK, [['open', async () => {}]])
// /inbox/demo/ (the Inbox's own package, under the site's headers)
await run('demo-light', '/inbox/demo/#case=E0225', DESK, [['case', async () => {}]])
await run('demo-dark', '/inbox/demo/', DARK, [['list', async () => {}]])
await run('demo-phone', '/inbox/demo/', PHONE, [['list', async () => {}]])
// an old link to the Toolkit's FAQ lands on /toolkit/
await run('oldlink', '/#faq-import', DESK, [['lands', async () => {}]])

// the blog (plan 22)
for (const [name, path] of [['goten', '/blog/from-bank-statement-to-exit/'], ['trunks', '/blog/every-investor-email/']]) {
  const steps = [hero, ['film', at('.article__media')], ['figure', at('figure:nth-of-type(2)')], ['footer', bottom]]
  await run(`blog-${name}-light`, path, DESK, steps)
  await run(`blog-${name}-dark`, path, DARK, steps.slice(0, 3))
  await run(`blog-${name}-phone`, path, PHONE, steps)
}
await run('blog-list', '/blog/', DESK, [hero])
await run('blog-list-phone', '/blog/', PHONE, [hero])

// module pages: once the global nav has scrolled away the page nav shows, and each of its links lands the section's
// heading below it (plan 14 R10)
for (const [path, vp] of [
  ['/inbox/', DESK],
  ['/toolkit/', DESK],
  ['/inbox/', PHONE],
]) {
  const p = await b.newPage(vp)
  await p.goto(BASE + path)
  await p.waitForTimeout(800)
  await p.evaluate(() => scrollTo(0, 400))
  await p.waitForTimeout(500)
  if (!(await p.$eval('[data-subnav]', (n) => n.classList.contains('is-on')))) errs.push(`${path}: the page nav did not show after scrolling`)
  for (const id of await p.$$eval('[data-subnav] [data-nav-links] a', (as) => as.map((a) => a.getAttribute('href').slice(1)))) {
    await p.click(`[data-subnav] [data-nav-links] a[href="#${id}"]`)
    await p.waitForTimeout(1500)
    const m = await p.evaluate((id) => {
      const s = document.getElementById(id)
      const h = s.querySelector('h2:not(.sr-only), .card, h3') ?? s
      const bar = document.querySelector('[data-subnav]').getBoundingClientRect().bottom
      return { top: Math.round(h.getBoundingClientRect().top), bar: Math.round(bar) }
    }, id)
    console.log('lands', path, vp.viewport.width, id, JSON.stringify(m))
    if (m.top < m.bar + 8 || m.top > m.bar + 120) errs.push(`${path} at ${vp.viewport.width}px: #${id} lands at ${m.top}px, sub-nav ends at ${m.bar}px`)
  }
  await p.close()
}

// page width at phone sizes, and the nav never wraps from 761 to 1200 px
const p = await b.newPage()
for (const path of ['/', '/toolkit/', '/inbox/', '/inbox/demo/']) {
  for (const w of [320, 375, 390, 768]) {
    await p.setViewportSize({ width: w, height: 800 })
    await p.goto(BASE + path)
    await p.waitForTimeout(300)
    const docW = await p.evaluate(() => document.documentElement.scrollWidth)
    if (docW > w) errs.push(`${path} at ${w}px: page is ${docW}px wide`)
  }
  if (path === '/inbox/demo/') continue
  const wrapped = []
  for (let w = 761; w <= 1200; w++) {
    await p.setViewportSize({ width: w, height: 800 })
    const bad = await p.evaluate(() => {
      const nav = document.querySelector('[data-nav]')
      const parts = [...nav.children].filter((e) => getComputedStyle(e).display !== 'none')
      const tall = parts.some((e) => e.getBoundingClientRect().height > 48)
      const r = parts.map((e) => e.getBoundingClientRect())
      const overlap = r.some((a, i) => i && a.left < r[i - 1].right - 0.5)
      return tall || overlap || nav.scrollWidth > nav.clientWidth + 1
    })
    if (bad) wrapped.push(w)
  }
  if (wrapped.length) errs.push(`${path}: nav wraps or overlaps at ${wrapped[0]}–${wrapped.at(-1)}px (${wrapped.length} widths)`)
}
console.log('errors', JSON.stringify(errs))
await b.close()
