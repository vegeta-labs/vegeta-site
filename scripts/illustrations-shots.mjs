// Focused R14 browser checks and review frames. Start site-preview.mjs first.
// Usage: node scripts/illustrations-shots.mjs <out-dir> [baseURL]
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const out = process.argv[2]
assert.ok(out, 'provide an output directory')
mkdirSync(out, { recursive: true })
const base = process.argv[3] ?? 'http://localhost:4181'
const browser = await chromium.launch()
const errors = []
const variants = {
  light: { viewport: { width: 1440, height: 900 } },
  dark: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  short: { viewport: { width: 1261, height: 657 } },
  phone: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  narrow: { viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true },
  reduced: { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  noscript: { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false },
  noobserver: { viewport: { width: 1440, height: 900 } },
}
try {
  for (const [variant, options] of Object.entries(variants).filter(([name]) => !process.argv[4] || process.argv[4].split(',').includes(name))) {
    const page = await browser.newPage(options)
    page.on('pageerror', (e) => errors.push(`${variant}: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && errors.push(`${variant}: ${m.text()}`))
    if (variant === 'noobserver') await page.addInitScript(() => delete window.IntersectionObserver)
    for (const path of ['/goten/', '/trunks/']) {
      await page.goto(base + path)
      await page.evaluate(() => document.fonts.ready)
      const cards = page.locator('[data-card]')
      const count = await cards.count()
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i)
        await page.evaluate((i) => {
          const deck = document.querySelector('[data-deck]')
          const pinned =
            matchMedia('(min-width: 900px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)').matches &&
            document.documentElement.classList.contains('js')
          if (pinned)
            scrollTo({
              top: deck.getBoundingClientRect().top + scrollY + ((deck.offsetHeight - innerHeight) * i) / (deck.querySelectorAll('[data-card]').length - 1),
              behavior: 'instant',
            })
          else document.querySelectorAll('[data-card]')[i].scrollIntoView({ block: 'center', behavior: 'instant' })
        }, i)
        if (variant !== 'noscript') await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
        const illus = card.locator('[data-illus]')
        const key = await illus.getAttribute('data-illus')
        const animated = !['reduced', 'noscript', 'noobserver'].includes(variant)
        if (animated) {
          await page.waitForFunction((i) => document.querySelectorAll('[data-illus]')[i].classList.contains('is-on'), i)
          const state = await illus.evaluate((el) =>
            el.getAnimations({ subtree: true }).map((a) => ({ infinite: a.effect.getTiming().iterations === Infinity, playState: a.playState })),
          )
          assert.ok(state.length && state.every((a) => a.infinite && a.playState === 'running'), `${variant}/${key}: visible animation must loop`)
          // Capture all sequences at the same settled point rather than a random phase of the loop.
          await illus.evaluate((el) =>
            el.getAnimations({ subtree: true }).forEach((a) => {
              a.pause()
              a.currentTime = 3100
            }),
          )
        }
        const measures = await illus.evaluate((el) => {
          const bounds = el.getBoundingClientRect()
          const visibleHeight = Math.max(0, Math.min(innerHeight, bounds.bottom) - Math.max(0, bounds.top))
          const visibleWidth = Math.max(0, Math.min(innerWidth, bounds.right) - Math.max(0, bounds.left))
          const visibility = (visibleHeight * visibleWidth) / (bounds.width * bounds.height)
          const centre = document.elementFromPoint(
            Math.max(0, Math.min(innerWidth - 1, bounds.left + bounds.width / 2)),
            Math.max(0, Math.min(innerHeight - 1, bounds.top + bounds.height / 2)),
          )
          const frontmost = el.contains(centre)
          const frame = el.closest('.media__frame').getBoundingClientRect()
          const card = el.closest('.card').getBoundingClientRect()
          const leaves = [...el.querySelectorAll('*')].filter((n) => !n.children.length && n.textContent.trim() && n.getClientRects().length)
          const clipped = leaves
            .filter((n) => {
              const r = n.getBoundingClientRect()
              return r.left < frame.left - 1 || r.right > frame.right + 1 || r.top < frame.top - 1 || r.bottom > frame.bottom + 1
            })
            .map((n) => n.textContent)
          return {
            visibility,
            frontmost,
            clipped,
            frameInCard: frame.top >= card.top && frame.bottom <= card.bottom,
            width: document.documentElement.scrollWidth,
            viewport: innerWidth,
            a: [...el.querySelectorAll('.swap__a')].map((n) => getComputedStyle(n).opacity),
            b: [...el.querySelectorAll('.swap__b')].map((n) => getComputedStyle(n).opacity),
            hidden: [...el.querySelectorAll('.ia')].some((n) => getComputedStyle(n).opacity !== '1'),
            animations: el.getAnimations({ subtree: true }).length,
          }
        })
        assert.ok(measures.visibility >= 0.6, `${variant}/${key}: illustration must be actually visible`)
        assert.ok(measures.frontmost, `${variant}/${key}: illustration is covered by another card`)
        assert.deepEqual(measures.clipped, [], `${variant}/${key}: illustration clips text`)
        assert.ok(measures.frameInCard, `${variant}/${key}: illustration exceeds its card`)
        assert.equal(measures.width, measures.viewport, `${variant}/${key}: sideways overflow`)
        assert.ok(!measures.hidden, `${variant}/${key}: final content hidden`)
        assert.ok(measures.a.every((a) => a === '0') && measures.b.every((b) => b === '1'), `${variant}/${key}: final state incorrect`)
        if (!animated) assert.equal(measures.animations, 0, `${variant}/${key}: static fallback animates`)
        await card.screenshot({ path: `${out}/${variant}-${key}.png` })
        console.log(`${variant}/${key}: PASS`)
        if (animated) {
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
          await page.waitForFunction((i) => !document.querySelectorAll('[data-illus]')[i].classList.contains('is-on'), i)
          assert.equal(await illus.evaluate((el) => el.getAnimations({ subtree: true }).length), 0, `${variant}/${key}: hidden card still animates`)
        }
      }
    }
    await page.close()
  }
  // R18: incoming illustrations run before reaching the top, independent of the current step.
  for (const variant of ['light', 'dark', 'short']) {
    const page = await browser.newPage(variants[variant])
    page.setDefaultTimeout(10000)
    page.on('pageerror', (e) => errors.push(`independent/${variant}: ${e.message}`))
    for (const path of ['/goten/', '/trunks/']) {
      await page.goto(base + path)
      const count = await page.locator('[data-card]').count()
      for (let i = 1; i < count; i++) {
        for (const fraction of [0.45, 0.55, 0.65]) {
          await page.evaluate(
            (progress) => {
              const d = document.querySelector('[data-deck]')
              scrollTo({
                top: d.getBoundingClientRect().top + scrollY + ((d.offsetHeight - innerHeight) * progress) / (d.querySelectorAll('[data-card]').length - 1),
                behavior: 'instant',
              })
            },
            i - 1 + fraction,
          )
          await page.waitForFunction((i) => document.querySelectorAll('[data-illus]')[i].classList.contains('is-on'), i)
          const state = await page
            .locator('[data-illus]')
            .nth(i)
            .evaluate((el) => ({
              cardTop: el.closest('[data-card]').getBoundingClientRect().top,
              anchor: parseFloat(getComputedStyle(el.closest('[data-deck]').querySelector('.deck__stage')).top),
              current: [...document.querySelectorAll('[data-deck-link]')].findIndex((a) => a.getAttribute('aria-current') === 'step'),
              running: el.getAnimations({ subtree: true }).every((a) => a.playState === 'running' && a.effect.getTiming().iterations === Infinity),
              y: scrollY,
              time: el.getAnimations({ subtree: true })[0]?.currentTime,
            }))
          assert.ok(state.cardTop > state.anchor + 10 && state.running, 'incoming card must animate before it reaches the top')
          if (fraction === 0.45) assert.equal(state.current, i - 1, 'animation must start even while the previous step is marked current')
          await page.waitForTimeout(200)
          const after = await page
            .locator('[data-illus]')
            .nth(i)
            .evaluate((el) => ({ y: scrollY, time: el.getAnimations({ subtree: true })[0]?.currentTime }))
          assert.equal(after.y, state.y, 'stopping in the middle must not trigger an automatic page movement')
          assert.ok(after.time > state.time + 100, 'animation time must advance while the card stays in the middle')
        }
      }
      console.log(`independent/${variant}${path}: every incoming illustration plays at45/55/65%, including before the current-step change PASS`)
    }
    await page.close()
  }
  // Visibility and reduced-motion preference changes must also work during an active cycle.
  const page = await browser.newPage(variants.light)
  page.on('pageerror', (e) => errors.push(`lifecycle: ${e.message}`))
  for (const path of ['/goten/', '/trunks/']) {
    await page.goto(base + path)
    const focus = () =>
      page.evaluate(() => {
        const deck = document.querySelector('[data-deck]')
        scrollTo({ top: deck.getBoundingClientRect().top + scrollY, behavior: 'instant' })
      })
    await focus()
    await page.waitForFunction(() => document.querySelector('[data-illus]').classList.contains('is-on'))
    // Simulate Page Visibility API events; no production code is changed for this test.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForFunction(() => document.querySelector('[data-illus]').classList.contains('is-paused'))
    assert.ok(
      await page
        .locator('[data-illus]')
        .first()
        .evaluate((el) => el.getAnimations({ subtree: true }).every((a) => a.playState === 'paused')),
      'hidden tab animation keeps running',
    )
    await page.evaluate(() => {
      delete document.hidden
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForFunction(() => !document.querySelector('[data-illus]').classList.contains('is-paused'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => !document.querySelector('[data-illus]').classList.contains('is-on'))
    assert.equal(
      await page
        .locator('[data-illus]')
        .first()
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
      0,
      'preference change must stop all illustration motion',
    )
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await focus()
    await page.waitForFunction(() => document.querySelector('[data-illus]').classList.contains('is-on'))
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
    for (const width of [320, 761, 1261, 1440]) await page.setViewportSize({ width, height: 900 })
    console.log(`lifecycle ${path}: hidden tab, live motion preference, scrolled resize PASS`)
  }
  await page.close()
  assert.deepEqual(errors, [], 'browser/CSP errors')
  console.log('Selected illustration profiles, visibility/motion lifecycle, fit and CSP: PASS')
} finally {
  await browser.close()
}
