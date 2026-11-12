// Visible headline loops, deep-link returns and motion/visibility lifecycle, using real browser timers.
// Usage: node scripts/hero-ui-walkthrough.mjs <out-dir> [baseURL]
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const out = process.argv[2]
assert.ok(out, 'provide an output directory')
mkdirSync(out, { recursive: true })
const base = process.argv[3] || 'http://localhost:4181'
const browser = await chromium.launch()
const reports = []
const active = (page) => page.locator('[data-rotator] .rot__item').evaluateAll((items) => items.findIndex((el) => el.classList.contains('is-on')))
async function watch(page) {
  return page.evaluate(() => {
    const box = document.querySelector('[data-rotator]')
    const items = [...box.querySelectorAll('.rot__item')]
    let previous = items.findIndex((item) => item.classList.contains('is-on'))
    window.heroChanges = []
    new MutationObserver(() => {
      const index = items.findIndex((item) => item.classList.contains('is-on'))
      if (index !== previous) window.heroChanges.push({ index, at: performance.now() })
      previous = index
    }).observe(box, { subtree: true, attributes: true, attributeFilter: ['class'] })
    return items.length
  })
}
async function check(name, fn, options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options })
  if (init) await context.addInitScript(init)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  try {
    const details = await fn(page)
    assert.deepEqual(errors, [], `${name}: browser errors`)
    await page.screenshot({ path: `${out}/${name}.png` })
    reports.push({ name, ...details, errors })
    console.log(JSON.stringify(reports.at(-1)))
  } finally {
    await context.close()
  }
}
const jobs = []
for (const path of ['/', '/goten/', '/trunks/'])
  jobs.push(() =>
    check('loops-' + (path.split('/')[1] || 'home'), async (page) => {
      await page.goto(base + path)
      const count = await watch(page)
      await page.locator('h1').hover()
      await page.waitForFunction((n) => window.heroChanges.length >= n, count * 2 + 1, { timeout: count * 4000 + 6000 })
      const changes = await page.evaluate(() => window.heroChanges)
      changes.forEach((e, i) => {
        assert.equal(e.index, (i + 1) % count, 'continues through two complete loops and into the next')
        if (i) assert.ok(Math.abs(e.at - changes[i - 1].at - 2000) < 300, 'two-second timing while hovered')
      })
      const phoneFit = []
      for (const width of [320, 375, 390]) {
        await page.setViewportSize({ width, height: 812 })
        await page.evaluate(() => document.fonts.ready)
        const fit = await page.locator('[data-rotator]').evaluate((box) => ({
          width: innerWidth,
          limit: box.getBoundingClientRect().right,
          phrases: [...box.querySelectorAll('.rot__item')].map((item) => ({
            text: item.textContent,
            end: [...item.querySelectorAll('.ch')].at(-1).getBoundingClientRect().right,
          })),
        }))
        for (const phrase of fit.phrases) assert.ok(phrase.end <= fit.limit + 1, `${path} at${width}px: ${phrase.text}`)
        phoneFit.push(fit)
      }
      return { count, changes, phoneFit }
    }),
  )
for (const hash of ['#build', '#faq'])
  jobs.push(() =>
    check('deep-' + hash.slice(1), async (page) => {
      await page.goto(base + '/' + hash)
      await page.waitForFunction(() => document.querySelector('[data-rotator]').getBoundingClientRect().bottom < 0)
      const count = await watch(page)
      assert.ok(await page.locator('[data-rotator]').evaluate((el) => el.getBoundingClientRect().bottom < 0))
      await page.waitForTimeout((count + 1) * 2000)
      assert.equal(await active(page), 0, 'a deep link must not consume the headline offscreen')
      assert.equal(await page.evaluate(() => window.heroChanges.length), 0)
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await page.waitForFunction(() => window.heroChanges.length >= 2, null, { timeout: 5500 })
      return { hash, offscreenWaitMs: (count + 1) * 2000, changesAfterReturn: await page.evaluate(() => window.heroChanges) }
    }),
  )
jobs.push(() =>
  check('lifecycle', async (page) => {
    await page.goto(base + '/')
    const count = await watch(page)
    await page.waitForFunction(() => window.heroChanges.length >= 1)
    let saved = await active(page)
    await page.locator('#build').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(100)
    await page.waitForTimeout(2300)
    assert.equal(await active(page), saved, 'offscreen title is paused')
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForFunction((n) => [...document.querySelectorAll('.rot__item')].findIndex((el) => el.classList.contains('is-on')) !== n, saved, {
      timeout: 3000,
    })
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    saved = await active(page)
    await page.waitForTimeout(2300)
    assert.equal(await active(page), saved, 'simulated hidden-tab event stops rotation')
    await page.evaluate(() => {
      delete document.hidden
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForFunction(
      (n) =>
        [...document.querySelectorAll('.rot__item')].findIndex((el) => el.classList.contains('is-on')) ===
        (n + 1) % document.querySelectorAll('.rot__item').length,
      saved,
      { timeout: 3000 },
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    saved = await active(page)
    await page.waitForTimeout(2300)
    assert.equal(await active(page), saved, 'reduced motion stops the current loop')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForFunction(
      (n) =>
        [...document.querySelectorAll('.rot__item')].findIndex((el) => el.classList.contains('is-on')) ===
        (n + 1) % document.querySelectorAll('.rot__item').length,
      saved,
      { timeout: 3000 },
    )
    return { count, offscreenResume: true, hiddenEventResume: true, liveMotionPreference: true }
  }),
)
for (const width of [320, 375, 390])
  jobs.push(() =>
    check(
      'phone-' + width,
      async (page) => {
        await page.goto(base + '/trunks/')
        const count = await watch(page)
        const phrases = []
        for (let i = 0; i < count; i++) {
          await page.waitForFunction((i) => [...document.querySelectorAll('.rot__item')].findIndex((el) => el.classList.contains('is-on')) === i, i)
          await page.waitForTimeout(800)
          const bounds = await page.locator('[data-rotator]').evaluate((box) => {
            const letters = [...box.querySelectorAll('.rot__item.is-on .ch')]
            return {
              phrase: box.querySelector('.is-on').textContent,
              right: letters.at(-1).getBoundingClientRect().right,
              limit: box.getBoundingClientRect().right,
              page: document.documentElement.scrollWidth,
              viewport: innerWidth,
            }
          })
          assert.ok(bounds.right <= bounds.limit + 1, `headline text fits at${width}px: ${bounds.phrase}`)
          assert.equal(bounds.page, bounds.viewport)
          phrases.push(bounds)
        }
        return { width, phrases }
      },
      { viewport: { width, height: 812 }, isMobile: true, hasTouch: true },
    ),
  )
jobs.push(() =>
  check(
    'static-no-observer',
    async (page) => {
      await page.goto(base + '/trunks/')
      await watch(page)
      await page.waitForTimeout(2300)
      assert.equal(await active(page), 0)
      assert.equal(await page.evaluate(() => window.heroChanges.length), 0)
      return { staticFirstPhrase: true }
    },
    {},
    () => {
      delete window.IntersectionObserver
    },
  ),
)
let next = 0
try {
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < jobs.length) await jobs[next++]()
    }),
  )
  writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2))
} finally {
  await browser.close()
}
