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
  captions()
  reel()
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

/** Film captions: an iPhone (iOS 18) refuses to play a video whose page already lists a caption track (MEDIA_ERR_SRC_NOT_SUPPORTED, found
    2026-11-11 by elimination on the owner's phone), so the page names the file in data-captions and the track is added once the video has loaded. */
function captions() {
  document.querySelectorAll('video[data-captions]').forEach((video) => {
    const add = () => {
      if (video.querySelector('track')) return
      const track = document.createElement('track')
      Object.assign(track, { kind: 'captions', src: video.dataset.captions, srclang: 'en', label: 'English' })
      video.append(track)
    }
    if (video.readyState > 0) add()
    else video.addEventListener('loadedmetadata', add)
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

/** Plan 32: the home page's film reel. One fragment shader draws the loop, the broken edge (the blog cards' 2 px grain and coverage curve)
    and the frosted noise every frame, so the hover fill and the spread are smooth. The button spreads the circle into the film's frame
    (16:9, or 4:5 on an upright screen) and the film plays in place; Escape or its end folds it back. Without WebGL the still stays and the
    film plays in a plain player in the same place; without the script the button opens the file. */
const REEL_FS = `precision highp float;
uniform vec2 size,loopSize;uniform float sphere,swirl,time,dpr,R,a,b,pw,band,isRound,dark,seed,filmMix,grain,fill,zone;uniform vec4 box,filmBox;uniform sampler2D loopTex,filmTex;
float h(vec2 q){q=fract(q*vec2(123.34,456.21));q+=dot(q,q+45.32);return fract(q.x*q.y);}
vec2 vort(vec2 p,vec2 c,float r,float a){vec2 d=p-c;a*=exp(-dot(d,d)/(r*r));return c+mat2(cos(a),-sin(a),sin(a),cos(a))*d;}
float cover(vec2 p){vec2 d=abs((floor(p/2.)+.5)*2.-size*.5);
if(isRound>.5){float g=R-length(d),base=pow(clamp(g/zone,0.,1.),1.25);return base+(1.-base)*clamp(fill*1.35-clamp(1.-g/zone,0.,1.)*.35,0.,1.)*step(R*.06,g);}
return pow(clamp(b*(1.-pow(pow(d.x/a,pw)+pow(d.y/b,pw),1./pw))/band,0.,1.),1.25);}
void main(){vec2 p=vec2(gl_FragCoord.x,size.y*dpr-gl_FragCoord.y)/dpr;
if(h(floor(p/2.)+17.)>=cover(p)){gl_FragColor=vec4(0.);return;}
vec2 C=size*.5,o=(p-C)/R;float rr=min(length(o),.999),t=time*1.7;vec2 q=C+o*R*mix(1.,asin(rr)/max(rr,1e-4)*.6366,sphere);q=vort(q,C+R*vec2(.35*sin(t*.21),.3*cos(t*.17)),R*.38,swirl*(2.4+.8*sin(t*.31)));q=vort(q,C+R*vec2(-.4*cos(t*.13),.35*sin(t*.19)),R*.32,-swirl*(2.+.7*sin(t*.23+1.)));q=vort(q,C+R*vec2(.1*sin(t*.11),-.45*cos(t*.15)),R*.25,swirl*(1.6+.6*sin(t*.37+2.)));float s=max(box.z/loopSize.x,box.w/loopSize.y);vec2 l=loopSize*s;vec3 c=texture2D(loopTex,(q-box.xy-(box.zw-l)*.5)/l).rgb*(1.-dark)*(1.-sphere*.55*pow(rr,3.));
vec2 f=(p-filmBox.xy)/filmBox.zw;if(filmMix>0.&&f==clamp(f,0.,1.))c=mix(c,texture2D(filmTex,f).rgb,filmMix);
float g=h(floor(p)+seed);c=mix(c,mix(2.*c*g,1.-2.*(1.-c)*(1.-g),step(.5,c)),grain);gl_FragColor=vec4(c,1.);}`

function reel() {
  const box = document.querySelector('[data-reel]')
  if (!box) return
  const frame = box.querySelector('.reel__frame')
  const canvas = box.querySelector('canvas')
  const [loop, film] = box.querySelectorAll('video')
  const btn = box.querySelector('[data-reel-play]')
  const over = box.querySelector('.reel__over')
  const cc = box.querySelector('.reel__cc')
  const ccBtn = box.querySelector('[data-reel-cc]')
  const BLEED = 60 // the canvas reaches past the frame, so the spreading fragments are never cut off
  const U = {}
  let gl = null
  if ('IntersectionObserver' in window && 'ResizeObserver' in window)
    try {
      gl = canvas.getContext('webgl', { antialias: false })
      // the grain's hash needs full float range: a GPU without it gets the plain player
      if (!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision) throw 0
      const prog = gl.createProgram()
      for (const [type, src] of [
        [gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'],
        [gl.FRAGMENT_SHADER, REEL_FS],
      ]) {
        const sh = gl.createShader(type)
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        gl.attachShader(prog, sh)
      }
      gl.bindAttribLocation(prog, 0, 'p')
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw 0
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      for (const n of REEL_FS.match(/uniform [^;]+;/g).flatMap((u) => u.split(' ').pop().slice(0, -1).split(','))) U[n] = gl.getUniformLocation(prog, n)
      for (const unit of [0, 1]) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
        for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 22, 25, 255]))
      }
      gl.uniform1i(U.filmTex, 1)
      gl.uniform2f(U.loopSize, 1, 1)
    } catch {
      gl = null
    }
  const set = (n, ...v) => gl['uniform' + v.length + 'f'](U[n], ...v)
  const upload = (unit, v) => {
    if (v.readyState < 2) return false
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v)
    return true
  }
  let FW = 0
  let FH = 0
  let dpr = 1
  let hover = 0
  let hoverTo = 0
  let open = 0
  let openTo = 0
  let last = 0
  let tick = 0
  let seed = 0
  let seen = false
  let running = false
  let captions = false
  // a paused video is uploaded once, not every frame: these say a new frame is waiting
  let loopNew = true
  let loopHas = false
  let filmNew = false
  let filmOk = false

  function draw(now) {
    if (!gl) return (running = false)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    const quick = !moving()
    // 0.45 s from broken to whole at a steady pace; the spread takes 1.1 s, folding back 0.8 s
    hover = quick ? hoverTo : hoverTo > hover ? Math.min(hoverTo, hover + dt / 0.45) : Math.max(hoverTo, hover - dt / 0.45)
    const step = quick ? 1 : dt / (openTo ? 1.1 : 0.8)
    open = openTo ? Math.min(1, open + step) : Math.max(0, open - step)
    const W = FW + 2 * BLEED
    const H = FH + 2 * BLEED
    const R = Math.min(FW, FH) / 2
    const OH = FW > FH ? (FW * 9) / 16 : FH
    const e = easeInOut(Math.max(0, (open - 0.2) / 0.8))
    set('size', W, H)
    set('dpr', dpr)
    set('R', R)
    // the circle reads as a globe (a lens, darker at its rim) with three small whirls drifting through the picture (owner, 2026-11-11);
    // both fade out as it opens, so the film plays flat
    set('sphere', 0.6 * (1 - e))
    set('swirl', 0.6 * (1 - e))
    if (!quick) set('time', now / 1000)
    // the resting broken zone is 58 px (wider than the blog cards'); a phone's small circle keeps it to a fifth of the radius
    set('zone', Math.max(1, Math.min(58, R / 5)))
    // the circle becomes a superellipse that squares off as it reaches the film's frame
    set('a', R + (FW / 2 - R) * e)
    set('b', R + (OH / 2 - R) * e)
    set('pw', 2 + 18 * e * e)
    set('isRound', e < 0.001 ? 1 : 0)
    // the playing frame keeps a thin broken border: 22 px, less on a small frame so it does not eat the film's numbers
    set('band', 3 * (1 - e) + Math.min(22, FW / 50) * e + 90 * Math.sin(Math.PI * e))
    set('fill', Math.max(hover, Math.min(1, open / 0.2)))
    set('box', BLEED, BLEED, FW, FH)
    // the loop is hidden under the open film, and a paused video keeps its last uploaded frame
    if (open < 1 && (!loop.paused || loopNew) && upload(0, loop)) {
      loopNew = false
      loopHas = true
      set('loopSize', loop.videoWidth, loop.videoHeight)
    }
    if (open > 0.85 && (!film.paused || filmNew) && upload(1, film)) {
      filmNew = false
      filmOk = true
    }
    const showFilm = open > 0.85 && filmOk
    set('dark', open === 1 && showFilm ? 0.68 : 0.26)
    set('filmMix', showFilm ? Math.min(1, (open - 0.85) / 0.15) : 0)
    set('filmBox', BLEED, (H - OH) / 2, FW, OH)
    // the frosted noise changes 8 times a second; none over the film, which carries its own print texture
    const k = Math.floor(now / 125)
    if (!quick && k !== tick) {
      tick = k
      seed = (seed + 37.7) % 1000
    }
    set('seed', seed)
    set('grain', open > 0.85 ? 0 : 0.16)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    // frames are drawn only while something moves: a transition, the grain and loop at rest, the playing film, or a new frame to show
    const live = seen && (open === 1 ? !film.paused : open === 0 && moving())
    if (live || open !== openTo || hover !== hoverTo || (seen && ((loopNew && open < 1) || (filmNew && open > 0.85)))) requestAnimationFrame(draw)
    else running = false
  }
  const run = () => {
    if (running || !gl) return
    running = true
    last = performance.now()
    requestAnimationFrame(draw)
  }
  const size = () => {
    if (!gl) return
    const r = frame.getBoundingClientRect()
    FW = r.width
    FH = r.height
    dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = Math.round((FW + 2 * BLEED) * dpr)
    canvas.height = Math.round((FH + 2 * BLEED) * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
    // a phone turned during the film switches to the cut for the new frame, at the same moment
    if (openTo && !film.src.endsWith(cut())) {
      const at = film.currentTime
      const playing = !film.paused
      film.src = cut()
      film.preload = 'auto'
      filmOk = false
      film.addEventListener(
        'loadedmetadata',
        () => {
          film.currentTime = at
          if (playing && openTo) film.play().catch(() => {})
        },
        { once: true },
      )
    }
    run()
  }
  const plain = () => {
    gl = null
    box.classList.remove('has-gl')
    if (!openTo) return
    film.controls = true
    film.focus({ preventScroll: true })
  }
  // a wide frame plays the wide web cut, an upright one the film as made
  const cut = () => (frame.offsetWidth > frame.offsetHeight ? '/media/vegeta-film-wide.mp4' : '/media/vegeta-film.mp4')
  const playLoop = () => (seen && moving() && !openTo ? loop.play().catch(() => {}) : loop.pause())
  const setCaptions = () => {
    captions = !captions
    const track = film.textTracks[0]
    if (track) track.mode = captions ? 'hidden' : 'disabled'
    ccBtn.setAttribute('aria-pressed', captions)
    showCue()
  }
  // the CC and close icons show while the pointer moves or the film is paused, and fade 2 s after it stops
  let idle = 0
  const wake = () => {
    box.classList.remove('is-idle')
    clearTimeout(idle)
    idle = setTimeout(() => openTo && !film.paused && box.classList.add('is-idle'), 2000)
  }
  const toggle = () => (film.paused ? film.play().catch(() => {}) : film.pause())
  const showCue = () => (cc.textContent = (captions && film.textTracks[0]?.activeCues?.[0]?.text) || '')

  function start(e) {
    e.preventDefault()
    if (!film.src.endsWith(cut())) {
      film.src = cut()
      filmOk = false
    }
    filmNew = true
    film.currentTime = 0
    film.controls = !gl
    film.play().catch((err) => err.name === 'AbortError' || plain())
    openTo = 1
    loop.pause()
    box.classList.add('is-open')
    over.inert = true
    // without WebGL the plain player takes the keys
    // the open frame is a tab stop, so keyboard users can come back to it
    frame.tabIndex = 0
    ;(gl ? frame : film).focus({ preventScroll: true })
    const r = frame.getBoundingClientRect()
    // centred in the window below the nav bar, whatever its height (a phone's bar, a landscape phone's short window)
    const nav = document.querySelector('[data-nav]').getBoundingClientRect().bottom
    scrollTo({ top: r.top + scrollY - nav - Math.max(0, (innerHeight - nav - r.height) / 2), behavior: moving() ? 'smooth' : 'auto' })
    wake()
    run()
  }
  function stop() {
    film.pause()
    film.controls = false
    openTo = 0
    filmNew = false
    frame.tabIndex = -1
    cc.textContent = ''
    playLoop()
    box.classList.remove('is-open')
    over.inert = false
    btn.focus({ preventScroll: true })
    run()
  }
  btn.addEventListener('click', start)
  ccBtn.addEventListener('click', setCaptions)
  box.querySelector('[data-reel-close]').addEventListener('click', () => stop())
  for (const ev of ['pointermove', 'pointerdown', 'focusin']) frame.addEventListener(ev, wake)
  film.addEventListener('pause', wake)
  film.addEventListener('ended', stop)
  // the caption track arrives once the film has loaded (captions() below)
  film.textTracks.addEventListener('addtrack', (e) => {
    e.track.mode = captions ? 'hidden' : 'disabled'
    e.track.addEventListener('cuechange', showCue)
  })
  // on the playing film: a click or Space pauses and resumes, C shows the captions, Escape folds it back
  canvas.addEventListener('click', () => openTo && toggle())
  document.addEventListener('keydown', (e) => {
    if (!openTo) return
    if (e.key === 'Escape') stop()
    else if (e.target !== frame || !gl || e.metaKey || e.ctrlKey || e.altKey) return
    else if (e.key === ' ' || e.key === 'k') {
      e.preventDefault()
      toggle()
    } else if (e.key === 'c') setCaptions()
  })
  if (!gl) return
  box.classList.add('has-gl')
  canvas.addEventListener('webglcontextlost', plain)
  const fresh = (v, f) => ['loadeddata', 'seeked', 'pause'].forEach((ev) => v.addEventListener(ev, () => (f(), run())))
  fresh(loop, () => (loopNew = true))
  fresh(film, () => (filmNew = true))
  film.addEventListener('play', run)
  // until the loop gives a frame (phones may not autoplay it), the circle shows its poster
  const poster = new Image()
  poster.onload = () => {
    if (loopHas || !gl) return
    upload(0, poster)
    set('loopSize', poster.width, poster.height)
    run()
  }
  poster.src = loop.poster
  // a browser that plays the film but cannot hand its frames to WebGL (seen in an iPhone in-app browser) gets the plain player
  film.addEventListener('timeupdate', () => openTo && gl && !filmOk && film.currentTime > 1.5 && plain())
  for (const [ev, to] of [
    ['pointerenter', 1],
    ['pointerleave', 0],
    ['focus', 1],
    ['blur', 0],
  ])
    btn.addEventListener(ev, () => {
      hoverTo = to
      run()
    })
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting
    if (seen) loop.preload = 'auto'
    // scrolled away, the film waits where it was
    else film.pause()
    playLoop()
    run()
  }).observe(box)
  onMotionChange(() => (playLoop(), run()))
  new ResizeObserver(size).observe(frame)
}
