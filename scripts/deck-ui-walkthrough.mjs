// R18: compare scroll geometry with the approved live source and record independent illustration playback.
// Usage: node scripts/deck-ui-walkthrough.mjs <out-dir> [baseURL] [downloaded live site-src/site.js]
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
const out = process.argv[2]
assert.ok(out, 'provide an output directory')
mkdirSync(out, { recursive: true })
const base = process.argv[3] || 'http://localhost:4181'
const baselineSource = process.argv[4] && readFileSync(process.argv[4], 'utf8')
const browser = await chromium.launch()
const reports = []
const moveTo = async (page, progress) => {
  await page.evaluate((progress) => {
    const d = document.querySelector('[data-deck]')
    scrollTo({
      top: d.getBoundingClientRect().top + scrollY + ((d.offsetHeight - innerHeight) * progress) / (d.querySelectorAll('[data-card]').length - 1),
      behavior: 'instant',
    })
  }, progress)
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
}
const layout = (page) =>
  page.locator('[data-deck]').evaluate((d) => ({
    height: d.offsetHeight,
    stageHeight: d.querySelector('.deck__stage').offsetHeight,
    cards: [...d.querySelectorAll('[data-card]')].map((c) => ({
      ty: c.style.getPropertyValue('--ty'),
      scale: c.style.getPropertyValue('--s'),
      dim: c.style.getPropertyValue('--dim'),
    })),
  }))
try {
  for (const path of ['/goten/', '/trunks/']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } } })
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    const baseline = baselineSource ? await browser.newPage({ viewport: { width: 1440, height: 900 } }) : null
    try {
      if (baseline) {
        await baseline.route('**/site.js', (route) => route.fulfill({ contentType: 'text/javascript', body: baselineSource }))
        await baseline.goto(base + path)
      }
      await page.goto(base + path)
      const count = await page.locator('[data-card]').count()
      const points = [
        ...Array.from({ length: (count - 1) * 8 + 1 }, (_, i) => i / 8),
        ...Array.from({ length: (count - 1) * 8 + 1 }, (_, i) => count - 1 - i / 8),
      ]
      for (const progress of points) {
        await moveTo(page, progress)
        const actual = await layout(page)
        assert.equal(actual.height, count * 900, 'deck height must match the live per-step viewport geometry')
        if (baseline) {
          await moveTo(baseline, progress)
          assert.deepEqual(actual, await layout(baseline), `live scroll parity at progress${progress}`)
        }
      }
      await page.evaluate(() => {
        window.wheelPrevented = []
        addEventListener('wheel', (e) => window.wheelPrevented.push(e.defaultPrevented), { passive: true })
      })
      const native = []
      for (const [progress, deltas] of [
        [0, [1, 1.5, 1, 0.5, -0.1]],
        [1, [1, 1.5, 1, 0.5, -0.1]],
        [count - 1, [-1, -1.5, -1, -0.5, 0.1]],
      ]) {
        await moveTo(page, progress)
        await page.mouse.move(1000, 450)
        const before = await page.evaluate(() => scrollY)
        for (const delta of deltas) {
          await page.mouse.wheel(0, delta)
          await page.waitForTimeout(8)
        }
        await page.waitForTimeout(150)
        const stopped = await page.evaluate(() => scrollY)
        await page.waitForTimeout(500)
        assert.equal(await page.evaluate(() => scrollY), stopped, 'a light gesture must never trigger subsequent programmed page movement')
        assert.ok(Math.abs(stopped - before) < 10 && stopped !== before, 'light input must retain its native distance, without a whole-card jump')
        native.push({ progress, delta: stopped - before, noAutomaticMovement: true })
      }
      // Stop the second card in the middle and watch a complete illustration cycle without moving the page.
      await moveTo(page, 0.45)
      const incoming = page.locator('[data-illus]').nth(1)
      await page.waitForFunction(() => document.querySelectorAll('[data-illus]')[1].classList.contains('is-on'))
      assert.equal(await page.locator('[data-deck-link][aria-current="step"]').getAttribute('href'), '#step-1')
      await moveTo(page, 0.55)
      const before = await incoming.evaluate((el) => ({
        y: scrollY,
        top: el.closest('[data-card]').getBoundingClientRect().top,
        time: el.getAnimations({ subtree: true })[0]?.currentTime,
        start: el.getAnimations({ subtree: true })[0]?.startTime,
      }))
      assert.ok(before.top > 110, 'the incoming card must still be below its fixed position')
      await page.waitForTimeout(4300)
      const after = await incoming.evaluate((el) => ({
        y: scrollY,
        top: el.closest('[data-card]').getBoundingClientRect().top,
        time: el.getAnimations({ subtree: true })[0]?.currentTime,
      }))
      assert.equal(after.y, before.y)
      assert.equal(after.top, before.top)
      assert.ok(after.time > before.time + 4000, 'the illustration must complete a loop while its card remains in the middle')
      await moveTo(page, 0.65)
      assert.equal(
        await incoming.evaluate((el) => el.getAnimations({ subtree: true })[0]?.startTime),
        before.start,
        'scrolling a visible illustration must not restart its animation',
      )
      const unprevented = await page.evaluate(() => window.wheelPrevented.every((value) => !value))
      assert.ok(unprevented, 'no wheel input may be intercepted')
      assert.deepEqual(errors, [])
      await page.screenshot({ path: `${out}/${path.split('/')[1]}-playing-mid-scroll.png` })
      const video = page.video()
      await context.close()
      reports.push({
        page: path,
        liveBaselineCompared: Boolean(baseline),
        matchingPositions: points.length,
        native,
        independentCycleMs: Math.round(after.time - before.time),
        video: await video.path(),
        errors,
      })
      console.log(JSON.stringify(reports.at(-1)))
    } finally {
      if (baseline) await baseline.close()
      await context.close()
    }
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2))
} finally {
  await browser.close()
}
