// Project website motion (docs/en/SITE_HANDBOOK.md §3.4). The page is complete without this file: it only adds classes and
// CSS custom properties (through the CSSOM, which the CSP allows; the HTML carries no style attributes) and starts the step illustrations.
'use strict'

document.documentElement.classList.add('js')

// Plan 13 N29: the Toolkit moved from / to /toolkit/. An old link to one of its sections (/#faq-import, /#step-2, /#how,
// /#trust, /#built) lands on the same section there. Reads the address only; the overview page has none of these ids.
if (location.pathname === '/' && /^#(faq-[a-z-]+|step-[1-3]|how|trust|built)$/.test(location.hash)) location.replace('/toolkit/' + location.hash)

const motion = matchMedia('(prefers-reduced-motion: no-preference)')
const moving = () => motion.matches
const onMotionChange = (fn) => motion.addEventListener('change', fn)
const wide = matchMedia('(min-width: 900px) and (min-height: 620px)')
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

document.addEventListener('DOMContentLoaded', () => {
  rotator()
  reveals()
  navPill()
  navTone()
  scrollEffects()
  stepIllustrations()
  faqOpen()
  menuClose()
  subnavShow()
  ambientVideo()
  onceVideo()
  film()
})

/** The blog's film: Chromium ignores a click on the picture while nothing is loaded (preload="none"), so start it here. Its own controls do the rest. */
function film() {
  const video = document.querySelector('[data-film]')
  if (!video) return
  video.addEventListener('click', () => {
    if (video.readyState !== 0 || !video.paused) return
    const started = video.play()
    if (started) started.catch(() => {})
  })
}

/** Looping scenery and the blog's figures: each plays only while on screen and not under reduced motion; the still underneath is the same picture. */
/** Blog figures that tell one short story: they wait on their first frame until the part that changes is in view, play once and stop on
    the result. With reduced motion, no script or a failed video the poster stays: the complete result. */
function onceVideo() {
  if (!('IntersectionObserver' in window)) return
  document.querySelectorAll('[data-once]').forEach((video) => {
    const complete = video.getAttribute('poster')
    let failed = false
    let inView = false
    let started = false
    const showPoster = (src) => {
      video.setAttribute('poster', src)
      video.load()
      started = false
    }
    const setUp = () => {
      if (failed) return
      showPoster(moving() ? video.dataset.start : complete)
    }
    const giveUp = () => {
      failed = true
      showPoster(complete)
    }
    const update = () => {
      if (failed || !moving() || !started || video.ended) return
      if (inView && !document.hidden) {
        const playing = video.play()
        if (playing) playing.catch((e) => e.name === 'AbortError' || giveUp())
      } else video.pause()
    }
    video.addEventListener('error', giveUp)
    video.querySelector('source')?.addEventListener('error', giveUp)
    new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting
        // the story is in the window at the bottom, so most of the figure has to be on screen; a short screen cannot show that much
        const needed = Math.min(0.8, (0.8 * innerHeight) / e.boundingClientRect.height)
        if (inView && !started && moving() && e.intersectionRatio >= needed) started = true
        if (!inView && started) setUp()
        update()
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    ).observe(video)
    document.addEventListener('visibilitychange', update)
    onMotionChange(setUp)
    setUp()
  })
}

function ambientVideo() {
  if (!('IntersectionObserver' in window)) return
  document.querySelectorAll('[data-ambient]:not([data-once])').forEach((video) => {
    let seen = false
    let failed = false
    // if it cannot play, the complete still stays and nothing tries again
    const giveUp = () => {
      failed = true
      video.classList.remove('is-on')
      if (video.hasAttribute('poster')) video.load()
    }
    const update = () => {
      if (failed) return
      if (seen && moving() && !document.hidden) {
        const started = video.play()
        if (started) started.catch((e) => e.name === 'AbortError' || giveUp())
      } else video.pause()
    }
    video.addEventListener('playing', () => video.classList.add('is-on'))
    video.addEventListener('error', giveUp)
    video.querySelector('source')?.addEventListener('error', giveUp)
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting
      update()
    }).observe(video)
    document.addEventListener('visibilitychange', update)
    onMotionChange(() => {
      if (!moving()) {
        video.classList.remove('is-on')
        // a figure goes back to its complete still rather than stopping on a partial frame
        if (video.hasAttribute('poster')) video.load()
      }
      update()
    })
  })
}

/** Module pages (plan 14 R10): once the global nav has scrolled away with the page, the page's own nav comes down from the
    top, so only one bar shows at a time. Without the script it stays under the hero. */
function subnavShow() {
  const sub = document.querySelector('[data-subnav]')
  const nav = document.querySelector('[data-nav]')
  if (!sub || !nav) return
  if (!('IntersectionObserver' in window)) return sub.classList.add('is-on')
  new IntersectionObserver(([e]) => sub.classList.toggle('is-on', !e.isIntersecting)).observe(nav)
}

/** Phones: the native <details> menu closes once one of its links is followed, so it does not cover where it led. */
function menuClose() {
  const menu = document.querySelector('[data-menu]')
  if (!menu) return
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) menu.open = false
  })
}

/** Hero: the visible headline loops every 2 s. Offscreen, hidden tabs and reduced motion stop the timer;
    returning to the title resumes from its current phrase. The matching panel lifts with each phrase. */
function rotator() {
  const box = document.querySelector('[data-rotator]')
  if (!box) return
  const phrases = box.dataset.phrases.split('|').map((p) => p.split(':'))
  // the grey part is the first half ("Reconcile an SPV") or, with data-grey="rest", the second ("for deal operations.");
  // a second half that starts with punctuation follows without a space ("Every deal email,")
  const greyRest = box.dataset.grey === 'rest'
  box.textContent = ''
  const items = phrases.map(([verb, rest]) => {
    const item = document.createElement('span')
    item.className = 'rot__item'
    for (const [text, cls] of [
      [verb, greyRest ? '' : 'rot__verb'],
      [(/^[,.;:]/.test(rest) ? '' : ' ') + rest, greyRest ? 'rot__verb' : ''],
    ]) {
      const part = document.createElement('span')
      if (cls) part.className = cls
      for (const c of text) {
        const ch = document.createElement('span')
        ch.className = 'ch'
        ch.textContent = c
        part.append(ch)
      }
      item.append(part)
    }
    box.append(item)
    return item
  })
  // letters are numbered across the whole phrase, so the stagger runs on from the verb into the rest
  for (const item of items) item.querySelectorAll('.ch').forEach((ch, i) => ch.classList.add('d' + Math.min(i, 19)))
  let at = 0
  items[0].classList.add('is-on')
  if (!('IntersectionObserver' in window)) return
  let visible = false
  let timer = 0
  let entrance = 0
  function turn() {
    if (!visible || document.hidden || !moving()) return
    const from = items[at]
    at = (at + 1) % items.length
    const to = items[at]
    from.classList.remove('is-on', 'is-in')
    from.classList.add('is-out')
    to.classList.remove('is-out')
    to.classList.add('is-on', 'is-in')
    setTimeout(() => from.classList.remove('is-out'), 220)
    lightPanel(at)
  }
  function update() {
    if (!visible || document.hidden || !moving()) {
      clearInterval(timer)
      clearTimeout(entrance)
      timer = 0
      items.forEach((item) => item.classList.remove('is-in', 'is-out'))
      lightPanel(-1)
      return
    }
    if (timer) return
    entrance = setTimeout(() => lightPanel(at), 1600)
    timer = setInterval(turn, 2000)
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    update()
  }).observe(box)
  document.addEventListener('visibilitychange', update)
  onMotionChange(update)
}

/** Hero illustration: the panel for the phrase the headline shows lifts a little (the rotator calls this). A panel can
    stand for several phrases (data-step="1 2 3"). */
function lightPanel(i) {
  document.querySelectorAll('[data-scene] [data-step]').forEach((p) => p.classList.toggle('is-lit', p.dataset.step.split(' ').includes(String(i))))
}

/** Headings and text float in once as they enter the view. */
function reveals() {
  const els = document.querySelectorAll('[data-reveal]')
  if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('is-in'))
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  )
  els.forEach((e) => io.observe(e))
}

/** The hover pill slides under the link the pointer or the keyboard is on (in each bar that has one). */
function navPill() {
  for (const list of document.querySelectorAll('[data-nav-links]')) pillFor(list)
}
function pillFor(list) {
  const pill = list.querySelector('[data-nav-pill]')
  if (!pill) return
  const move = (a) => {
    pill.style.setProperty('--pill-x', a.offsetLeft + 'px')
    pill.style.setProperty('--pill-w', a.offsetWidth + 'px')
    list.classList.add('is-hover')
  }
  for (const a of list.querySelectorAll('a')) {
    a.addEventListener('mouseenter', () => move(a))
    a.addEventListener('focus', () => move(a))
  }
  list.addEventListener('mouseleave', () => list.classList.remove('is-hover'))
  list.addEventListener('focusout', (e) => {
    if (!list.contains(e.relatedTarget)) list.classList.remove('is-hover')
  })
}

/** The glass navigation, and a module page's sub-nav once it is stuck under it, turn dark while a dark section sits under
    them. The watched band is each bar's own strip, in pixels: Intersection Observer resolves percentage margins against
    the width, not the height. The sub-nav's strip is where it sticks (its CSS top), so it is right once it is stuck. */
function navTone() {
  const dark = document.querySelectorAll('[data-tone="dark"]')
  if (!dark.length || !('IntersectionObserver' in window)) return
  for (const bar of document.querySelectorAll('[data-nav], [data-subnav]')) {
    let io
    const watch = () => {
      if (io) io.disconnect()
      const top = bar.matches('[data-subnav]') ? parseFloat(getComputedStyle(bar).top) || 0 : bar.getBoundingClientRect().top
      const mid = clamp(Math.round(top + bar.offsetHeight / 2), 0, Math.max(0, innerHeight - 1))
      const under = new Set()
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) under.add(e.target)
            else under.delete(e.target)
          bar.classList.toggle('is-dark', under.size > 0)
        },
        { rootMargin: `-${mid}px 0px -${Math.max(0, innerHeight - mid - 1)}px 0px` },
      )
      dark.forEach((d) => io.observe(d))
    }
    watch()
    addEventListener('resize', watch)
  }
}

/** A link to one FAQ question (#faq-import) opens it, on arrival and on later in-page links. Reads the address only. */
function faqOpen() {
  const open = () => {
    let id = ''
    try {
      id = decodeURIComponent(location.hash.slice(1))
    } catch {
      return // a malformed address matches nothing
    }
    const el = id && document.getElementById(id)
    if (el && el.matches('.faq__item')) el.open = true
  }
  addEventListener('hashchange', open)
  open()
}

/** The live site's native scroll-linked deck. Playback is handled separately below. */
function scrollEffects() {
  const deck = document.querySelector('[data-deck]')
  const cards = deck ? [...deck.querySelectorAll('[data-card]')] : []
  const cardsBox = deck && deck.querySelector('.deck__cards')
  const links = deck ? [...deck.querySelectorAll('[data-deck-link]')] : []
  let active = -1
  let queued = false
  const pinned = () => wide.matches && motion.matches

  function frame() {
    queued = false
    if (!deck) return
    if (!pinned()) {
      for (const c of cards) for (const k of ['--ty', '--s', '--dim']) c.style.removeProperty(k)
      return
    }
    const rect = deck.getBoundingClientRect()
    const run = deck.offsetHeight - innerHeight
    const p = clamp(-rect.top / run, 0, 1) * (cards.length - 1)
    // Card i comes up from below the stage as p goes i − 1 → i (cards later in the page paint on top, so no z-index swap
    // and no cut); once covered it steps back 14 px and 4 % per card above it, and darkens, so its top edge peeks out.
    const below = cardsBox.offsetHeight + 48
    cards.forEach((c, i) => {
      const up = i === 0 ? 1 : easeInOut(clamp(p - (i - 1), 0, 1))
      const back = easeInOut(clamp(p - i, 0, 1)) + easeInOut(clamp(p - i - 1, 0, 1))
      c.style.setProperty('--ty', ((1 - up) * below - back * 14).toFixed(2) + 'px')
      c.style.setProperty('--s', (1 - back * 0.04).toFixed(4))
      c.style.setProperty('--dim', Math.min(back, 1).toFixed(3))
    })
    const now = clamp(Math.round(p), 0, cards.length - 1)
    links.forEach((a, i) => a.querySelector('.deck__bar > span').style.setProperty('--fill', clamp(p - i + 1, 0, 1).toFixed(3)))
    // aria-current only changes when the step does, so screen readers are not told on every frame
    if (now !== active)
      links.forEach((a, i) => {
        if (i === now) a.setAttribute('aria-current', 'step')
        else a.removeAttribute('aria-current')
      })
    active = now
  }

  function queue() {
    if (queued) return
    queued = true
    requestAnimationFrame(frame)
  }

  // the step links scroll to where that card is fully up, not to the card's own (stacked) position
  links.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      if (!pinned()) return
      e.preventDefault()
      const run = deck.offsetHeight - innerHeight
      const top = deck.getBoundingClientRect().top + scrollY + (run * i) / (cards.length - 1)
      scrollTo({ top, behavior: 'smooth' })
    })
  })

  addEventListener('scroll', queue, { passive: true })
  addEventListener('resize', queue)
  onMotionChange(queue)
  document.addEventListener('visibilitychange', queue)
  wide.addEventListener('change', queue)
  queue()
}

/** Each illustration loops as soon as it intersects the view, regardless of card position or the current step. */
function stepIllustrations() {
  const illus = [...document.querySelectorAll('[data-illus]')]
  if (!('IntersectionObserver' in window)) {
    illus.forEach((el) => el.classList.add('is-static'))
    return
  }
  const visible = new Set()
  const update = () => {
    for (const el of illus) {
      const shown = visible.has(el)
      el.classList.toggle('is-on', shown && moving())
      el.classList.toggle('is-paused', document.hidden || !shown)
    }
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) visible.add(entry.target)
      else visible.delete(entry.target)
    update()
  })
  illus.forEach((el) => observer.observe(el))
  document.addEventListener('visibilitychange', update)
  onMotionChange(update)
}
