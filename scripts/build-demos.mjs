// Demos page (plan 42, brief v3): writes site/demos/index.html from the Goten scene text extracted from the real app
// (site-src/demos-goten.json, by scripts/demos-extract-goten.mjs) and the scene choices and copy
// (site-src/demos-goten.scenes.json). The page shell (nav, footer) is copied from /goten/ so it stays the same.
// renderDemos() is also called by scripts/check-demos.mjs, which fails when the committed page is not its output.
// Run: node scripts/build-demos.mjs, then Prettier on the page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { demoHubCards } from './hub-cards.mjs'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// Goten's markers from the extraction: ⟦value⟧ a field, ☑ ☐ an option, ‹label› a button, «text» a badge (or a group of controls)
const ui = (s) =>
  esc(s)
    .replace(/⟦([^⟧]*)⟧/g, '<span class="dm-field">$1</span>')
    .replace(/‹([^›]*)›/g, '<span class="dm-ub">$1</span>')
    .replace(/«([^»]*)»/g, (_, t) => `<span class="${t.includes('<span') ? 'dm-grp' : 'dm-pill'}">${t.trim()}</span>`)
    .replace(/☑ ?/g, '<span class="dm-box is-on"></span>')
    .replace(/☐ ?/g, '<span class="dm-box"></span>')
// the visible words of a marked line
export const bare = (s) =>
  String(s ?? '')
    .replace(/[⟦⟧☑☐‹›«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const isMoney = (s) => /^[-+]?£?[\d,]+(\.\d+)?x?$/.test(bare(s))

function card(scene, extracted, pid) {
  const lines = extracted.wide
  const covers = scene.covers ?? {}
  const focus = scene.focus
  const isTable = (l) => Array.isArray(l) && (l.length > 2 || scene.cols)
  const th = scene.rows.find((i) => isTable(lines[i])) // the table's header row
  const header = lines[th]
  const cols = scene.cols ?? (Array.isArray(header) ? header.map((_, c) => c) : [])
  const attrs = (i, cls) => {
    const all = [cls, focus.row === i && focus.col === undefined ? 'dm-focus' : ''].filter(Boolean).join(' ')
    return `${all ? ` class="${all}"` : ''} data-l="${i}"${covers[i] ? ` data-covers="${covers[i]}"` : ''}`
  }
  const cellsOf = (l, i) =>
    cols.map((c) => {
      const cls = ['dm-td', isMoney(l[c]) ? 'dm-nw' : c === cols[0] ? 'dm-name' : '', focus.row === i && focus.col === c ? 'dm-focus' : '']
        .filter(Boolean)
        .join(' ')
      const label = scene.stack && i !== th && c !== cols[0] ? ` data-label="${esc(bare(header[c]))}"` : ''
      const nh = scene.narrowHide?.includes(c) ? ' data-nh="1"' : scene.tinyHide?.includes(c) ? ' data-nh="2"' : ''
      return `<span class="${cls}" data-c="${c}"${label}${nh}>${ui(l[c] ?? '')}</span>`
    })
  const gapRow = `<div class="dm-tr dm-gap">${cols.map(() => '<span class="dm-td"></span>').join('')}</div>`
  const out = []
  let table = null
  let prev = null
  const tableLines = lines.map((l, i) => (isTable(l) ? i : -1)).filter((i) => i >= 0)
  for (const i of scene.rows) {
    const l = lines[i]
    if (l === undefined) throw new Error(`${scene.id}: no line ${i}`)
    if (isTable(l)) {
      if (!table) out.push((table = []))
      // rows left out of the drawing show as a dashed gap, never as a complete-looking list
      if (prev !== null && tableLines.some((t) => t > prev && t < i)) table.push(gapRow)
      table.push(`<div${attrs(i, i === th ? 'dm-tr dm-th' : 'dm-tr')}>${cellsOf(l, i).join('')}</div>`)
      prev = i
      continue
    }
    table = null
    if (Array.isArray(l))
      out.push(`<div${attrs(i, 'dm-kv')}><span>${ui(l[0])}</span><span${isMoney(l[1]) ? ' class="dm-nw"' : ''}>${ui(l[1] ?? '')}</span></div>`)
    else if (scene.pre) {
      if (prev !== null && lines.slice(prev + 1, i).some((x) => x.trim())) out.push('<span class="dm-pre-gap"></span>')
      out.push(`<span${attrs(i, 'dm-pre-l')}>${esc(l)}</span>`)
      prev = i
    } else {
      // a run of the module's own tags (Trunks' risk, status, queue and due labels) drawn on one line, as the app shows them
      const run = (scene.inline ?? []).find((g) => g.includes(i))
      if (run) {
        if (i === run[0]) out.push(`<p class="dm-tags">${run.map((j) => `<span${attrs(j, 'dm-tg')}>${ui(lines[j])}</span>`).join(' ')}</p>`)
        continue
      }
      const cls = scene.tour ? (i <= 2 ? 'dm-chip' : i === 3 ? 'dm-step' : i >= 6 ? 'dm-btn' : 'dm-p') : 'dm-p'
      // a writing field (a reason, a note, a message) is drawn as a multi-line well, not a short value
      const body = scene.wells?.includes(i) ? ui(l).replace('class="dm-field"', 'class="dm-field dm-field--well"') : ui(l)
      out.push(`<p${attrs(i, cls)}>${body}</p>`)
    }
  }
  const last = scene.rows.at(-1)
  // a list the scene stops short of (Trunks' cases) ends in the same dashed gap as a shortened table
  if (scene.more) out.push('<span class="dm-pre-gap"></span>')
  if (scene.pre ? lines.slice(last + 1).some((x) => x.trim()) : isTable(lines[last]) && tableLines.some((t) => t > last)) {
    if (scene.pre) out.push('<span class="dm-pre-gap"></span>')
    else out.at(-1).push(gapRow)
  }
  const parts = out.map((g) => (Array.isArray(g) ? `<div class="dm-table">${g.join('')}</div>` : g))
  let body = parts.join('\n')
  if (scene.pre) body = `<div class="dm-pre">${body}</div>`
  if (scene.tour)
    body = `<div class="dm-chips">${parts.slice(0, 3).join('')}</div>${parts.slice(3, 6).join('')}<div class="dm-btns">${parts.slice(6).join('')}</div>`
  const headText = scene.head?.line !== undefined ? bare(lines[scene.head.line]) : scene.head?.extracted ? extracted.head : null
  const headAttr =
    scene.head?.line !== undefined
      ? ` data-l="${scene.head.line}"${covers[scene.head.line] ? ` data-covers="${covers[scene.head.line]}"` : ''}`
      : ' data-head="1"'
  const head = headText ? `<p class="dm-card__head"><span${headAttr}>${esc(headText)}</span></p>` : ''
  // what the emphasis marks, said in words for a screen reader
  const fl = lines[focus.row]
  const focusText =
    focus.col !== undefined
      ? bare(fl[focus.col])
      : Array.isArray(fl)
        ? (cols.length ? cols : fl.map((_, c) => c)) // a label and value pair has no table header: all its cells
            .map((c) => bare(fl[c]))
            .filter(Boolean)
            .join(', ')
        : bare(fl)
  const label = `${scene.alt} Highlighted: ${focusText.replace(/"/g, '').replace(/[.:;]$/, '')}.`
  const kind = [scene.stack ? 'dm-card--stack' : '', scene.why ? 'dm-card--why' : '', scene.tour ? 'dm-card--tour' : ''].filter(Boolean).join(' ')
  const state = extracted.state ? ` data-state="${esc(extracted.state)}"` : ''
  return `<div class="dm-card${kind ? ' ' + kind : ''}" role="img" aria-label="${esc(label)}" data-demo="${pid}/${scene.id}"${state}>
  <div class="dm-card__in" aria-hidden="true">
  ${head}
  ${body}
  </div>
</div>`
}

const copy = (scene) =>
  scene.copy.map(([t, c], i) => `<span class="${i === 0 ? 'dm-lead' : 'dm-more'}"${c ? ` data-covers="${c}"` : ''}>${esc(t)}</span>`).join(' ')
const path = (s) => esc(s).replace(/\[\[([^\]]+)\]\]/g, '<span class="dm-ui">$1</span>')

// the modules drawn on the page, in the order of the site's nav
export const PRODUCTS = ['bulma', 'goten', 'trunks']

export function readInputs(root = '.') {
  const read = (f) => readFileSync(join(root, f), 'utf8')
  return {
    products: PRODUCTS.map((id) => ({ id, data: JSON.parse(read(`site-src/demos-${id}.json`)), spec: JSON.parse(read(`site-src/demos-${id}.scenes.json`)) })),
    shell: read('site/goten/index.html'),
    // the module names and released versions the docs index shows (kept in step with the release notes by build-docs)
    docs: JSON.parse(read('site-src/docs.json')),
  }
}

// one module: its heading, its bar (the section links, which sticks while the module is on screen), its needs and scenes
function productSection({ id: pid, data, spec }) {
  const p = spec.product
  const needs = spec.needs
    .map(
      (n) => `<section class="dm-need" id="${pid}-${n.id}" aria-labelledby="${pid}-${n.id}-h">
  <h2 class="dm-need__title" id="${pid}-${n.id}-h">${esc(n.title)}</h2>
  ${n.scenes
    .map((s) => {
      const id = s.id.toLowerCase()
      const x = data.scenes[s.id]
      if (!x) throw new Error(`no extracted text for ${s.id}`)
      return `<article class="dm-scene" id="${pid}-${id}" aria-labelledby="${pid}-${id}-h">
    <div class="dm-text">
      <h3 class="dm-title" id="${pid}-${id}-h">${esc(s.title)}</h3>
      <p class="dm-copy">${copy(s)}</p>
    </div>
    ${card(s, x, pid)}
  </article>`
    })
    .join('\n')}
  <p class="dm-try"><a href="${p.app}">Try it in ${esc(p.name)} <span class="arrow" aria-hidden="true">→</span></a><span class="dm-try__path"${n.pathCovers ? ` data-covers="${n.pathCovers}"` : ''}>${path(n.path)}</span></p>
</section>`,
    )
    .join('\n')
  return `<section class="demos__product demos__product--${pid}" id="${pid}" aria-label="${esc(p.name)} demos">
    ${needs}
    <p class="dm-end"><a class="btn btn--primary" href="${p.app}">Open ${esc(p.name)}</a> <a class="btn btn--quiet" href="${p.run}">Run it on your own machine <span class="arrow" aria-hidden="true">→</span></a></p>
  </section>`
}

const LOGO = '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 5h7l5 16 5-16h7L18 28h-4z" /></svg>'

// the modules as page links, the current one marked
const chips = (products, current) => `<nav class="blogchips demos__chips" aria-label="Module demos">
    ${products.map((m) => `<a href="/demos/${m.id}/"${m.id === current ? ' aria-current="page"' : ''}>${esc(m.spec.product.name)}</a>`).join('\n')}
  </nav>`

// the page shell from /goten/: head (title, description, canonical), the global nav with Demos marked, the footer
function page(shell, url, title, desc, main, subnav, docsCss = false) {
  const head = shell
    .slice(0, shell.indexOf('<main'))
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(name="description"\s+content=")[^"]*"/, `$1${desc}"`)
    .replace(/(property="og:title" content=")[^"]*"/, `$1${title}"`)
    .replace(/(property="og:description"\s+content=")[^"]*"/, `$1${desc}"`)
    .replace(/(name="twitter:title" content=")[^"]*"/, `$1${title}"`)
    .replace(/(name="twitter:description"\s+content=")[^"]*"/, `$1${desc}"`)
    .replace(/https:\/\/vegeta-ops\.vercel\.app\/goten\//g, `https://vegeta-ops.vercel.app${url}`)
    .replace(/ aria-current="page"/g, '')
    .replace(/<a href="\/demos\/">Demos<\/a>/g, '<a href="/demos/" aria-current="page">Demos</a>')
    .replace('<body class="has-subnav">', subnav ? '<body class="has-subnav">' : '<body>')
    .replace(
      '<link rel="stylesheet" href="/styles.css" />',
      docsCss ? '<link rel="stylesheet" href="/styles.css" />\n    <link rel="stylesheet" href="/docs.css" />' : '<link rel="stylesheet" href="/styles.css" />',
    )
  return head + main + shell.slice(shell.indexOf('</main>') + '</main>'.length)
}

// Demos (plan 42, owner 2026-11-24: each module on its own page, not mixed): /demos/ leads to one page per module
export function renderDemos({ products, shell, docs }) {
  const pages = {}
  pages['/demos/'] = page(
    shell,
    '/demos/',
    'Demos | Vegeta',
    'See each Vegeta module at work, feature by feature, then try it live.',
    // the docs index's own cards (owner 2026-11-24: the two module hubs look alike); a module not drawn yet is an off card
    `<main id="main">
  <div class="blogindex__intro">
    <p class="eyebrow section-label">Demos</p>
    <h1 class="blogindex__title">See each module at work.</h1>
  </div>
  <div class="docs-index">
    <div class="docs-index__cards">
      ${demoHubCards(docs, products)}
    </div>
  </div>
</main>`,
    false,
    true,
  )
  for (const m of products) {
    const p = m.spec.product
    const links = m.spec.needs.map((n) => `<a href="#${m.id}-${n.id}">${esc(n.nav)}</a>`).join('\n')
    pages[`/demos/${m.id}/`] = page(
      shell,
      `/demos/${m.id}/`,
      `${p.name} demo | Vegeta`,
      `See ${p.name} at work, feature by feature, then try it live.`,
      `<main id="main" class="demos">
  <div class="blogindex__intro demos__intro" id="top">
    <p class="eyebrow section-label"><a href="/demos/">Demos</a></p>
    <h1 class="blogindex__title">${esc(p.full)}</h1>
  </div>
  ${chips(products, m.id)}
  <nav class="dm-toc" aria-label="${esc(p.name)} demo sections">
    ${links}
  </nav>
  <nav class="nav subnav" aria-label="${esc(p.name)} demo" data-subnav>
    <span class="nav__brand glass subnav__brand"><a href="/" aria-label="Vegeta home">${LOGO}</a><a class="subnav__name" href="#top">${esc(p.name)}</a></span>
    <span class="nav__links glass" data-nav-links>
      <span class="nav__pill" aria-hidden="true" data-nav-pill></span>
      ${links}
    </span>
    <span class="nav__end"><a class="nav__cta glass" href="${p.app}">Open ${esc(p.name)}</a></span>
  </nav>
  ${productSection(m)}
</main>`,
      true,
    )
  }
  return pages
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputs = readInputs()
  const ref = readFileSync('goten.ref', 'utf8').trim()
  const goten = inputs.products.find((m) => m.id === 'goten').data
  if (goten.goten !== ref) throw new Error(`demos-goten.json is from Goten ${goten.goten}, goten.ref is ${ref}: rerun the extraction`)
  const pack = JSON.parse(readFileSync('site/trunks/demo/snapshot-info.json', 'utf8')).commit
  const trunks = inputs.products.find((m) => m.id === 'trunks').data
  if (trunks.trunks !== pack) throw new Error(`demos-trunks.json is from Trunks ${trunks.trunks}, the demo package is ${pack}: rerun the extraction`)
  const bulmaPack = JSON.parse(readFileSync('site/bulma/demo/snapshot-info.json', 'utf8')).commit
  const bulma = inputs.products.find((m) => m.id === 'bulma').data
  if (bulma.bulma !== bulmaPack) throw new Error(`demos-bulma.json is from Bulma ${bulma.bulma}, the demo package is ${bulmaPack}: rerun the extraction`)
  for (const [url, html] of Object.entries(renderDemos(inputs))) {
    mkdirSync(join('site', url), { recursive: true })
    writeFileSync(join('site', url, 'index.html'), html)
    console.log(`site${url}index.html written`)
  }
}
