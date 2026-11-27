// Demos page (plan 42): the in-page serialiser shared by the module extractors (scripts/demos-extract-*.mjs). It runs in
// the browser through page.evaluate, so it is one self-contained function: tables and dt/dd pairs become arrays of cells,
// inputs ⟦value⟧, ticks ☑ ☐, buttons ‹label›, inline badges and pills «text».
// one entry per visual line; a table row or a dt/dd pair is an array of cells
export function serialise(root) {
  const lines = []
  const visible = (el) => el.checkVisibility?.({ checkVisibilityCSS: true }) !== false && !el.hidden && !el.classList.contains('sr-only')
  const display = (el) => getComputedStyle(el).display
  const inline = (node) => {
    if (node.nodeType === 3) return node.textContent
    if (node.nodeType !== 1 || !visible(node)) return ''
    const el = node
    if (el.tagName === 'INPUT') {
      if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? '☑ ' : '☐ '
      return `⟦${el.value}⟧`
    }
    if (el.tagName === 'SELECT') return `⟦${el.selectedOptions[0]?.textContent ?? ''}⟧`
    if (el.tagName === 'TEXTAREA') return `⟦${el.value}⟧`
    if (el.tagName === 'BR') return '\n'
    if (el.classList.contains('term-q')) return '' // the glossary "?" button next to a term
    const t = [...el.childNodes].map(inline).join('').replace(/\s+/g, ' ').trim()
    if (el.tagName === 'BUTTON') return t ? ` ‹${t}› ` : ''
    const d = display(el)
    if (/^inline-(block|flex|grid)$/.test(d)) return t ? ` «${t}» ` : ''
    // a block inside an inline run (Goten's reasons under a step name on a phone) is its own run of text
    return d.startsWith('inline') || d === 'contents' ? t : ` ${t} `
  }
  const clean = (s) => s.replace(/\s+/g, ' ').trim()
  const isBlock = (el) => {
    const d = display(el)
    return !d.startsWith('inline') && d !== 'contents' ? true : d === 'contents' ? [...el.children].some(isBlock) : false
  }
  const walk = (el) => {
    if (!visible(el)) return
    if (el.tagName === 'TABLE') {
      for (const tr of el.querySelectorAll('tr')) if (visible(tr)) lines.push([...tr.children].filter(visible).map((c) => clean(inline(c))))
      return
    }
    if (el.tagName === 'DL') {
      let row = null
      for (const c of el.querySelectorAll('dt, dd')) {
        if (!visible(c)) continue
        if (c.tagName === 'DT') lines.push((row = [clean(inline(c))]))
        else if (row) row.push(clean(inline(c)))
      }
      return
    }
    if (el.tagName === 'PRE') {
      for (const l of el.textContent.split('\n')) lines.push(l)
      return
    }
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || !isBlock(el) || ![...el.children].some(isBlock)) {
      const t = clean(inline(el))
      if (t) lines.push(t)
      return
    }
    let buf = ''
    const flush = () => {
      const t = clean(buf)
      if (t) lines.push(t)
      buf = ''
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 1 && isBlock(n)) {
        flush()
        walk(n)
      } else buf += inline(n)
    }
    flush()
  }
  walk(root)
  return lines
}
