// /explore/ (plan 44, rethink 2026-11-27): ask the whole site. Without this script the page is the starter questions (each a link to its
// answer, shown by :target) and the map. With it: who you are picks one role's questions; a question shows its fixed answer under the
// field (no request). Typing suggests starter questions and pages from the page itself (no request); Enter sends only the typed text to
// /api/explore, which answers with catalog ids or a state, and the answer copies the map's own rows, so no text from the model reaches
// the page. An article in an AI answer links to the section whose heading shares most words with the question.
// What is shown lives in the tab's history entry (history.state, never stored or sent), so coming back to the page shows it again.
const ex = document.querySelector('[data-ex]')
const box = document.querySelector('[data-explore]')
if (ex && box && window.fetch) {
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const form = $('[data-explore-form]', box)
  const field = $('textarea', form)
  const count = $('[data-count]', form)
  const ghost = $('[data-ghost]', form)
  const go = $('.explore__go', form)
  const hints = $('[data-hints]', box)
  const status = $('[data-explore-status]', box)
  const ai = $('[data-ai]')
  const list = $('[data-explore-list]', ai)
  const states = $$('[data-state]', ai)
  const start = $('[data-start]')
  const tabs = $('.explore__tabs', start)
  const rows = $$('.explore__sec [data-x]')
  const qs = $$('[data-q]', start)
  const KNOWN = ['pages', 'suitability', 'none', 'paused', 'limit', 'daily', 'invalid']
  const STOP = new Set('an and are can do does for how in is it me my of on or our the to we what with you your'.split(' '))
  const asked = new Map()
  // the fixed questions as [answer id, question], the field's first suggestion first; a role's question id starts with its role
  const fixed = $$('[data-ans]').map((a) => [a.id, $('.explore__q', a).textContent.trim()])
  const roleOf = (id) => id && tabs.querySelector(`[data-tab="${id.split('-')[0]}"]`) && id.split('-')[0]
  let rest = '',
    full = ''
  let ctl,
    timer,
    gen = 0
  const say = (t) => (status.textContent = t)
  const keep = (o) =>
    history.replaceState({ ...history.state, ...o }, '', o.ans === undefined ? location.href : o.ans ? '#' + o.ans : location.pathname + location.search)
  // a plural matches its singular too (fees: fee schedule)
  const wordsOf = (q) => (q.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w))
  const has = (t, w) => (' ' + t).includes(' ' + w)

  const pick = (id) => {
    for (const b of tabs.children) b.setAttribute('aria-pressed', String(b.dataset.tab === id))
    for (const r of $$('[data-role]', start)) r.hidden = r.dataset.role !== id
  }
  // one answer at a time, under the field; its question leaves the list below
  const open = (id, move) => {
    const t = id === 'ai' ? ai : id && document.getElementById(id)
    for (const a of $$('[data-ans], [data-ai]')) a.hidden = a !== t
    for (const a of qs) a.parentNode.hidden = a.dataset.q === id
    if (move && t) {
      box.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      t.focus({ preventScroll: true })
    }
  }
  const show = (k) => {
    let line = ''
    states.forEach((el) => {
      el.hidden = el.dataset.state !== k
      if (!el.hidden) line = $('p', el).textContent
    })
    return line
  }
  // a copy of a map row as an answer row, with the answer's tag; an article can point at the section the AI picked, if the row lists it
  const copy = (el, sec) => {
    const li = el.cloneNode(true)
    const a = $('a', li)
    $('.explore__k', li).textContent = el.dataset.g
    const h = sec && (el.dataset.h ?? '').split('|').find((h) => h.startsWith(sec + ' '))
    if (h) {
      a.href += '#' + sec
      const s = document.createElement('span')
      s.className = 'explore__sh'
      s.textContent = '§ ' + h.slice(sec.length + 1)
      a.append(s)
    }
    return li
  }
  const local = (q) => {
    const words = wordsOf(q)
    const score = (t, name) => words.reduce((n, w) => n + (has(t, w) ? (has(name, w) ? 2 : 1) : 0), 0)
    const top = (xs) =>
      xs
        .filter((r) => r.n)
        .sort((a, b) => b.n - a.n)
        .map((r) => r.el)
    const name = (el) => $('.explore__t', el).textContent.toLowerCase()
    return [
      top(qs.map((el) => ({ el, n: score(el.textContent.toLowerCase(), '') }))).slice(0, 2),
      top(rows.map((el) => ({ el, n: score(el.dataset.s, name(el)) }))).slice(0, 5),
    ]
  }
  const suggest = () => {
    const q = field.value.trim()
    const [sq, pages] = q.length < 2 ? [[], []] : local(q)
    hints.replaceChildren(
      ...sq.map((a) => {
        const li = document.createElement('li')
        li.append(a.cloneNode(true))
        $('a', li).className = 'explore__hq'
        return li
      }),
      ...pages.slice(0, 5 - sq.length).map((el) => copy(el)),
    )
  }
  const answer = (q, d) => {
    let state = KNOWN.includes(d.state) ? d.state : 'paused'
    $('[data-aq]', ai).textContent = q
    let found = state === 'pages' ? (d.ids ?? []).map((id) => /^[a-z0-9-]+$/.test(id) && $(`.explore__sec [data-x="${id}"]`)).filter(Boolean) : []
    if (state === 'pages' && !found.length) state = 'none'
    // the AI found nothing or is unavailable: what the words match on the page, if anything
    if (state !== 'pages' && state !== 'suitability' && state !== 'invalid') found = local(q)[1]
    list.replaceChildren(...found.map((el) => copy(el, state === 'pages' && d.sections?.[el.dataset.x])))
    const line = show(state === 'pages' || (state === 'none' && found.length) ? '' : state)
    say(line || `${found.length} page${found.length === 1 ? '' : 's'}`)
  }

  // a question still out is dropped; back() shows again what the history entry holds (a stopped question leaves nothing behind)
  const cancel = () => {
    gen++
    if (ctl) ctl.abort()
  }
  const back = () => {
    const st = history.state ?? {}
    say('')
    if (st.ask && st.d) {
      answer(st.ask, st.d)
      open('ai')
    } else open(st.ans)
  }

  // who you are: the role of the question in the address, else the first
  tabs.hidden = false
  ex.classList.add('is-js')
  tabs.addEventListener('click', (e) => {
    if (!e.target.dataset.tab) return
    pick(e.target.dataset.tab)
    keep({ role: e.target.dataset.tab })
  })
  start.addEventListener('click', (e) => {
    const a = e.target.closest('[data-q]')
    if (!a) return
    e.preventDefault()
    cancel()
    keep({ ans: a.dataset.q, ask: null })
    open(a.dataset.q, true)
  })
  hints.addEventListener('click', (e) => {
    const a = e.target.closest('[data-q]')
    if (!a) return
    e.preventDefault()
    cancel()
    pick(a.dataset.q.split('-')[0])
    keep({ ans: a.dataset.q, ask: null, role: a.dataset.q.split('-')[0] })
    hints.replaceChildren()
    open(a.dataset.q, true)
  })
  // the open lists of the map come back too
  // an article opened from here: noted in this tab, so its "← Explore" can go back (not a shared link opened elsewhere)
  ex.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="?from=explore"]')
    try {
      if (a) sessionStorage.setItem('explore', new URL(a.href).pathname)
    } catch {}
  })
  ex.addEventListener('toggle', (e) => e.target.id && keep({ [e.target.id]: e.target.open }), true)

  box.hidden = false
  // the field grows with its text (CSS field-sizing where the browser has it); the count shows from 240 of the 300 characters
  const fit = () => {
    if (!CSS.supports('field-sizing', 'content')) {
      field.style.height = 'auto'
      field.style.height = field.scrollHeight + 'px'
    }
    const n = field.value.length
    count.textContent = n < 240 ? '' : `${n} / 300`
    count.classList.toggle('is-full', n >= 300)
    // the grey completion (owner 2026-11-27, like a code editor): the rest of the first fixed question that starts with what is typed,
    // or the field's first suggestion while it is empty; → at the end of the text, or Tab, takes it
    const v = field.value
    const lo = v.toLowerCase()
    const c = !v ? fixed[0] : v.trim().length > 1 && fixed.find(([, q]) => q.length > v.length && q.toLowerCase().startsWith(lo))
    rest = c ? c[1].slice(v.length) : ''
    full = c ? c[1] : ''
    const typed = document.createElement('span')
    typed.textContent = v
    const more = document.createElement('span')
    more.className = 'explore__rest'
    more.textContent = rest
    // no key hint after it (owner 2026-11-27)
    ghost.replaceChildren(...(rest ? [typed, more] : []))
  }
  // a click anywhere in the box but the button goes to the field
  form.addEventListener('click', (e) => e.target === form && field.focus())
  // Enter sends, Shift+Enter starts a new line; Enter that picks characters in an input method does not send
  field.addEventListener('keydown', (e) => {
    const end = field.selectionStart === field.value.length && field.selectionEnd === field.value.length
    if (rest && !e.isComposing && !e.shiftKey && (e.key === 'Tab' || (e.key === 'ArrowRight' && end))) {
      e.preventDefault()
      cancel()
      // the question as written, capitals included
      field.value = full
      field.setSelectionRange(field.value.length, field.value.length)
      fit()
      return suggest()
    }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return
    e.preventDefault()
    form.requestSubmit()
  })
  field.addEventListener('input', () => {
    fit()
    clearTimeout(timer)
    gen++
    if (ctl) ctl.abort()
    timer = setTimeout(suggest, 120)
  })
  box.addEventListener('focusout', (e) => box.contains(e.relatedTarget) || hints.replaceChildren())
  // (on the whole page: after a question the focus is on its answer)
  ex.addEventListener('keydown', (e) => {
    // Esc stops a question that is out, else closes the suggestions
    if (e.key === 'Escape' && (ctl || hints.firstChild)) {
      e.preventDefault()
      if (ctl) ctl.abort()
      else hints.replaceChildren()
    }
    // down from the field goes to the first suggestion; up from the first goes back to the field
    const links = $$('a', hints)
    const i = e.target === field ? -1 : links.indexOf(e.target)
    // from the field only at the end of its text, so the arrows still move between its lines
    if (!/^Arrow(Up|Down)$/.test(e.key) || !links.length || (i < 0 && (e.target !== field || e.key === 'ArrowUp' || field.selectionStart < field.value.length)))
      return
    e.preventDefault()
    ;(e.key === 'ArrowDown' ? links[i + 1] || links[i] : links[i - 1] || field).focus()
  })
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearTimeout(timer)
    const q = field.value.trim()
    hints.replaceChildren()
    if (!q) return field.focus()
    // a fixed question, typed or completed, gets its fixed answer: no request
    const hit = fixed.find(([, f]) => f.toLowerCase() === q.toLowerCase())
    if (hit) {
      cancel()
      if (roleOf(hit[0])) pick(roleOf(hit[0]))
      keep({ ans: hit[0], ask: null, role: roleOf(hit[0]) || history.state?.role })
      field.value = ''
      fit()
      return open(hit[0], true)
    }
    if (q.length < 2 || q.length > 300) {
      answer(q, { state: 'invalid' })
      return open('ai', true)
    }
    const done = (d) => {
      // stopped with Esc: what was there before
      if (!d.state) return back()
      answer(q, d)
      // the question now sits over its answer; the field is free for the next one
      keep({ ans: '', ask: q, d })
      field.value = ''
      fit()
    }
    if (asked.has(q)) {
      done(asked.get(q))
      return open('ai', true)
    }
    const mine = ++gen
    if (ctl) ctl.abort()
    ctl = new AbortController()
    const myCtl = ctl
    let late = false
    const stop = setTimeout(() => {
      late = true
      myCtl.abort()
    }, 15000)
    go.disabled = true
    $('[data-aq]', ai).textContent = q
    list.replaceChildren()
    show('')
    ai.classList.add('is-busy')
    ai.setAttribute('aria-busy', 'true')
    open('ai', true)
    say('Searching')
    let d = { state: 'paused' }
    try {
      // the site's no-referrer policy holds here too; the function checks the Origin and Sec-Fetch-Site headers
      const r = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
        credentials: 'omit',
        cache: 'no-store',
        signal: myCtl.signal,
      })
      if (r.status !== 403) d = await r.json()
      if (['pages', 'suitability', 'none'].includes(d.state)) asked.set(q, d)
    } catch {
      d = { state: myCtl.signal.aborted && !late ? '' : 'paused' }
    }
    clearTimeout(stop)
    if (ctl === myCtl) {
      ctl = null
      go.disabled = false
      ai.classList.remove('is-busy')
      ai.removeAttribute('aria-busy')
    }
    if (mine === gen) done(d)
    // stopped by typing: what was there before, unless a newer question is already out
    else if (!ctl) back()
  })

  // coming back: what the history entry holds, else the question in the address
  const st = history.state ?? {}
  const h = /^#[a-z]+-[a-z0-9-]+$/.test(location.hash) && document.getElementById(location.hash.slice(1))
  const sit = h && h.matches('[data-ans]') ? h.id : st.ans
  fit()
  pick(st.role || roleOf(sit) || tabs.children[0].dataset.tab)
  for (const [k, v] of Object.entries(st)) if (v === true && document.getElementById(k)?.matches('details')) document.getElementById(k).open = true
  if (st.ask && st.d) {
    answer(st.ask, st.d)
    open('ai')
  } else open(sit)
  // the place on the page: the browser's own restoring runs before the lists above are back, so the page keeps its own
  addEventListener('pagehide', () => keep({ y: scrollY }))
  if (st.y != null) {
    history.scrollRestoration = 'manual'
    scrollTo(0, st.y)
  }
}
