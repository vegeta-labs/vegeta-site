// Demos page checks (plan 42, brief v3 §2.3, §2.7, §5, §6.2, §7). The Goten scenes are drawn from text extracted from the
// real app at goten.ref (site-src/demos-goten.json, with each scene's heading and state). Checked here:
// - the committed page is exactly what scripts/build-demos.mjs renders from the committed inputs;
// - every drawn line and cell is the extracted text of that line and column, columns in the header's order, nothing else in
//   a row; the only other text in a card is the extracted heading; the phone extraction shows the
//   same words; the state is the extracted one; the aria-label names only what the panel shows;
// - one visible focus per card, on sourced text; the 52 listed features each sit on visible text;
// - every number in a title or copy is on that scene's panel or in a quote the scene cites, and the quote is in the file;
// - each scene's copy is 15 to 45 words; try-it paths name only controls that exist in Goten, numbers only from the steps.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { bare, readInputs, renderDemos } from './build-demos.mjs'

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 }

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
const text = (h) =>
  decode(h.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
const numbers = (s) => [
  ...[...s.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)].map((m) => m[0]),
  ...[...s.toLowerCase().matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g)].map((m) => String(WORD_NUMBERS[m[1]])),
]
const digits = (s) => s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi, (w) => String(WORD_NUMBERS[w.toLowerCase()]))
const words = (s) => bare(s).toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ')

// the element that starts at `at` (its open tag) and its matching close tag
function element(h, at) {
  const tag = /^<([a-z0-9]+)/i.exec(h.slice(at))[1]
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi')
  re.lastIndex = at
  let depth = 0
  for (let m; (m = re.exec(h));) {
    if (m[0].endsWith('/>')) continue
    depth += m[1] ? -1 : 1
    if (depth === 0) return h.slice(at, re.lastIndex)
  }
  throw new Error('unclosed element')
}
const children = (h, attr) =>
  [...h.matchAll(new RegExp(`<[a-z0-9]+\\b[^>]*\\s${attr}="([^"]*)"[^>]*>`, 'gi'))].map((m) => ({ value: m[1], html: element(h, m.index), tag: m[0] }))
// visually hidden, here or (for covers outside the cards) by the page
const hiddenTag = (tag) => /\shidden\b|\sdata-nh=|class="[^"]*\bsr-only\b/.test(tag)

// per module: its feature list (groups and counts, brief §6 / the module's feature list), where its words come from, and
// where its try-it links go
const MODULES = {
  goten: { name: 'Goten', features: { A: 7, B: 6, C: 10, D: 2, E: 8, F: 6, G: 7, H: 6 }, app: 'https://vegeta-goten.vercel.app', state: true },
  // Bulma (feature list v2, groups A–J; K–L, running an instance and its limits, have no screen in the demo and are left to
  // /bulma/ and the docs); the demo's own wording, the sandbox banner and the placeholder texts are never drawn
  bulma: {
    name: 'Bulma',
    features: { A: 14, B: 7, C: 9, D: 15, E: 9, F: 10, G: 11, H: 17, I: 10, J: 10 },
    app: '/bulma/demo/',
    state: false,
    demoOnly: ['Demo:', 'Demo view', 'PLACEHOLDER', 'Not legal text', 'not legal text'],
    // the pack names its placeholders and its reviewer "Sample …", and says sandbox and fictional throughout
    demoWords: [/\bsample\b/i, /\bsandbox\b/i, /\bfictional\b/i],
  },
  // Trunks (feature list v2, groups A–G; H–J have no screen in Trunks and are left to /trunks/ and the docs)
  // the static demo's own wording (its top bar, notes and the recorded-transfer label, Trunks presentation.ts) is never drawn
  trunks: {
    name: 'Trunks',
    features: { A: 5, B: 13, C: 6, D: 4, E: 8, F: 13, G: 8 },
    app: '/trunks/demo/',
    state: false,
    demoOnly: [
      'Fictional data',
      'View only',
      'About this demo',
      'Sample received times',
      'In a real deployment',
      'This demo shows',
      'Recorded transfer',
      'This snapshot records',
      'Suggested only',
    ],
  },
}

export function checkDemos({ pages, goten, trunks, bulma, fail }) {
  const inputs = readInputs('.')
  const ref = readFileSync('goten.ref', 'utf8').trim()
  const data = Object.fromEntries(inputs.products.map((m) => [m.id, m.data]))
  if (data.goten.goten !== ref)
    fail(`demos: site-src/demos-goten.json is from Goten ${data.goten.goten.slice(0, 7)}, goten.ref is ${ref.slice(0, 7)} (rerun the extraction)`)
  // Trunks is drawn from the locked demo package the site serves, built from trunks.ref
  const pack = JSON.parse(readFileSync('site/trunks/demo/snapshot-info.json', 'utf8'))
  if (data.trunks.trunks !== pack.commit || pack.commit !== readFileSync('trunks.ref', 'utf8').trim())
    fail(`demos: site-src/demos-trunks.json, the demo package and trunks.ref are not the same Trunks commit (rerun the extraction)`)
  // Bulma likewise, from the pack of bulma-demo.lock; a development pack ("dev": true) need not be from bulma.ref, and the
  // public snapshot refuses it
  const bulmaPack = JSON.parse(readFileSync('site/bulma/demo/snapshot-info.json', 'utf8'))
  const bulmaLock = JSON.parse(readFileSync('bulma-demo.lock', 'utf8'))
  if (data.bulma.bulma !== bulmaPack.commit || (!bulmaLock.dev && bulmaPack.commit !== readFileSync('bulma.ref', 'utf8').trim()))
    fail(`demos: site-src/demos-bulma.json, the demo package and bulma.ref are not the same Bulma commit (rerun the extraction)`)
  // the steps and the code that reads them, as scripts/demos-extract-trunks.mjs fingerprints them
  // each module's extraction was read with its current steps and extraction code
  const fingerprint = (id) =>
    createHash('sha256')
      .update(
        [`site-src/demos-${id}.steps.json`, `scripts/demos-extract-${id}.mjs`, 'scripts/demos-serialise.mjs'].map((f) => readFileSync(f, 'utf8')).join('\n'),
      )
      .digest('hex')
  if (data.goten.steps !== fingerprint('goten')) fail('demos: site-src/demos-goten.json was read with other steps or extraction code (rerun the extraction)')
  const stepsHash = createHash('sha256')
    .update(
      ['site-src/demos-trunks.steps.json', 'scripts/demos-extract-trunks.mjs', 'scripts/demos-serialise.mjs'].map((f) => readFileSync(f, 'utf8')).join('\n'),
    )
    .digest('hex')
  if (data.bulma.built !== bulmaPack.built_at || data.bulma.steps !== fingerprint('bulma'))
    fail('demos: site-src/demos-bulma.json was read from another build of the demo package, or with other steps or extraction code (rerun the extraction)')
  if (data.trunks.built !== pack.built_at || data.trunks.steps !== stepsHash)
    fail('demos: site-src/demos-trunks.json was read from another build of the demo package, or with other steps or extraction code (rerun the extraction)')
  // the page is the render of its inputs (whitespace aside: Prettier formats the page)
  const flat = (h) => h.replace(/\s+/g, '')
  const rendered = renderDemos(inputs)
  for (const [url, html] of Object.entries(rendered))
    if (flat(pages[url] ?? '') !== flat(html))
      fail(`demos: site${url}index.html is not what scripts/build-demos.mjs renders from its inputs (run it, then Prettier)`)
  const page = Object.values(pages).join('\n')

  const roots = { goten, trunks, bulma }
  // the words a try-it path may name: the module's own source, and for Trunks the demo's emails (their subjects)

  // Trunks' try-it paths may name only what the served read-only demo shows, whole: an email's subject or any string of its
  // data, or a label, value or heading the extraction read (a substring such as Approve in "Approved" does not count)
  const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [])
  const snapshot = readFileSync('site/trunks/demo/data/snapshot.js', 'utf8')
  const demoData = JSON.parse(snapshot.slice(snapshot.indexOf('(') + 1, snapshot.lastIndexOf(')')))
  const shown = new Set([...strings(demoData), ...strings(data.trunks.scenes).map(bare), ...Object.values(data.trunks.scenes).map((x) => x.head)])
  // Goten's: a control the extraction read on the app's screen, a step the extraction clicked, or text a scene shows
  const gotenSteps = JSON.parse(readFileSync('site-src/demos-goten.steps.json', 'utf8'))
  const gotenShown = new Set(
    [
      ...(data.goten.controls ?? []),
      ...strings({ ...gotenSteps.prelude, ...Object.fromEntries(Object.entries(gotenSteps.scenes).map(([k, v]) => [k, v.steps])) }),
      ...strings(data.goten.scenes).map(bare),
      ...Object.values(data.goten.scenes).map((x) => x.head),
    ].filter(Boolean),
  )
  // Bulma's: a whole string of the demo's data or of the demo's own script (a label or heading), a heading or line the
  // extraction read, or a view as its switch names it ("Lead (Bulma Briefs)")
  const bulmaSnap = readFileSync('site/bulma/demo/data/snapshot.js', 'utf8')
  const bulmaData = JSON.parse(bulmaSnap.slice(bulmaSnap.indexOf('})(') + 3, bulmaSnap.lastIndexOf(')')))
  const bulmaScript = readdirSync('site/bulma/demo/assets')
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join('site/bulma/demo/assets', f), 'utf8'))
    .join('\n')
  const bulmaShown = new Set([
    ...strings(bulmaData),
    ...strings(data.bulma.scenes).map(bare),
    ...Object.values(data.bulma.scenes).map((x) => x.head),
    ...Object.entries(bulmaData.views).map(([v, { name }]) => `${v[0].toUpperCase()}${v.slice(1)} (${name})`),
  ])
  // loose by design: any whole string literal of the demo's script counts (its labels and headings live there), so a
  // name the demo shows on another page also passes; the reviewer and the Bulma session read the paths
  const inScript = (name) => ['"', "'", '`'].some((q) => bulmaScript.includes(q + name + q))
  const exists = (pid, name) =>
    pid === 'bulma'
      ? bulmaShown.has(name) || inScript(name)
      : pid === 'trunks'
        ? shown.has(name)
        : gotenShown.has(name) || [...gotenShown].some((t) => t.split(/\s*[·:]\s*|\s*\(/)[0] === name)
  const cards = children(page, 'data-demo')
  const extracted = inputs.products.reduce((n, m) => n + Object.keys(m.data.scenes).length, 0)
  if (cards.length !== extracted) fail(`demos: ${cards.length} scene cards for ${extracted} extracted scenes`)
  for (const { id: pid, spec } of inputs.products) {
    const M = MODULES[pid]
    const x0 = data[pid]
    const scenes = Object.fromEntries(spec.needs.flatMap((n) => n.scenes.map((s) => [s.id, s])))
    const steps = JSON.parse(readFileSync(`site-src/demos-${pid}.steps.json`, 'utf8'))
    const at0 = `demos ${M.name}`
    const start = page.indexOf(`<section class="demos__product demos__product--${pid}"`)
    if (start < 0) {
      fail(`${at0}: no section`)
      continue
    }
    const section = element(page, start)
    // the demo's own wording, in what is drawn and in what a screen reader hears
    const said = text(section) + ' ' + [...section.matchAll(/aria-label="([^"]*)"/g)].map((m) => decode(m[1])).join(' ')
    for (const words of M.demoOnly ?? []) if (said.includes(words)) fail(`${at0}: draws the demo's own wording "${words}"`)
    for (const re of M.demoWords ?? []) if (re.test(said)) fail(`${at0}: draws the demo's own wording (${re.source})`)
    // plan 43: notices are said once, on /policy/; the copy never repeats them
    for (const words of [/investment, tax or legal advice/i, /not a regulated service/i, /\bfictional\b/i])
      if (words.test(text(section))) fail(`${at0}: repeats a notice (${words.source}); it belongs on /policy/`)
    for (const card of children(section, 'data-demo')) {
      const id = card.value.replace(`${pid}/`, '')
      const x = x0.scenes[id]
      const at = `demos ${M.name} ${id}`
      if (!x || !scenes[id]) {
        fail(`${at}: no extracted text or scene`)
        continue
      }
      const lines = x.wide
      if (M.state) {
        if (decode(/data-state="([^"]*)"/.exec(card.tag)?.[1] ?? '') !== x.state) fail(`${at}: data-state is not the extracted state`)
        if (x.state !== steps.scenes[id]?.state) fail(`${at}: the extraction's state is not the state of its steps (rerun the extraction)`)
      }
      // the phone shows the same words on each drawn line
      // (a table's header may lose cells on a phone, as Goten's exit table drops Why)
      const th = scenes[id].rows.find((i) => Array.isArray(lines[i]) && lines[i].length > 2)
      for (const l of scenes[id].rows) {
        const w = lines[l]
        const same = (m) => words([m].flat().join(' ')) === words([w].flat().join(' '))
        const fewer = (m) => l === th && Array.isArray(m) && m.every((c) => w.includes(c))
        if (!x.narrow?.some((m) => same(m) || fewer(m))) fail(`${at}: line ${l} reads differently in the app at phone width`)
      }
      // what the card draws (its rows and its heading), so a label cannot name what the card leaves out
      const headLine = scenes[id].head?.line !== undefined ? [lines[scenes[id].head.line]] : []
      const panelText = bare([...scenes[id].rows.map((i) => lines[i]), ...headLine].flat().join(' ') + ' ' + (x.head ?? ''))
      const label = decode(/aria-label="([^"]*)"/.exec(card.tag)?.[1] ?? '')
      if (!/role="img"/.test(card.tag) || !label) fail(`${at}: the card needs role="img" and an aria-label`)
      for (const n of numbers(label.replace(/ Highlighted: .*$/, '')))
        if (!numbers(panelText).includes(n)) fail(`${at}: the aria-label's ${n} is not on the panel`)
      // names: capitalised words after the first of each sentence must be on the panel
      for (const sentence of label.split(/(?<=[.:;])\s+/))
        for (const w of sentence.split(/\s+/).slice(1)) {
          const word = w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')
          if (/^[A-Z][a-z]+$/.test(word) && !panelText.includes(word) && word !== 'Highlighted')
            fail(`${at}: the aria-label names ${word}, which is not on the panel`)
        }
      // every drawn line is extracted text, in order, columns as the header orders them
      let left = card.html
      let last = -1
      let headerCols = null
      for (const row of children(card.html, 'data-l')) {
        const l = Number(row.value)
        if (!(l > last)) fail(`${at}: line ${l} drawn out of order`)
        last = l
        const line = lines[l]
        if (line === undefined) {
          fail(`${at}: line ${l} is not in the extraction`)
          continue
        }
        const cells = children(row.html, 'data-c')
        let rest = row.html
        if (cells.length) {
          const cols = cells.map((c) => Number(c.value))
          if (cols.some((c, i) => i && c <= cols[i - 1])) fail(`${at}: line ${l} cells are not in column order`)
          if (headerCols && cols.join() !== headerCols) fail(`${at}: line ${l} draws columns ${cols} under a header of ${headerCols}`)
          headerCols ??= cols.join()
          for (const c of cells) {
            if (text(c.html) !== bare(line[Number(c.value)]))
              fail(`${at}: line ${l} cell ${c.value} reads "${text(c.html)}", the app shows "${bare(line[Number(c.value)])}"`)
            rest = rest.replace(c.html, '')
          }
          if (text(rest)) fail(`${at}: line ${l} has text outside its cells: "${text(rest)}"`)
        } else {
          const want = bare([line].flat().join(' '))
          if (text(row.html) !== want) fail(`${at}: line ${l} reads "${text(row.html)}", the app shows "${want}"`)
        }
        left = left.replace(row.html, '')
      }
      for (const h of children(card.html, 'data-head')) {
        if (text(h.html) !== x.head) fail(`${at}: the heading "${text(h.html)}" is not the extracted heading "${x.head}"`)
        left = left.replace(h.html, '')
      }
      if (text(left)) fail(`${at}: text outside the module's panel: "${text(left)}"`)
      const focus = children(card.html, 'class').filter((e) => /\bdm-focus\b/.test(e.value))
      if (focus.length !== 1) fail(`${at}: ${focus.length} focus elements, the brief allows exactly one`)
      else if (!text(focus[0].html) || hiddenTag(focus[0].tag) || !/\sdata-[lc]=/.test(focus[0].tag))
        fail(`${at}: the focus is empty, hidden or not extracted text`)
      if (/<a\b|<button\b/.test(card.html)) fail(`${at}: a scene has nothing to click`)
    }

    // titles and copy: numbers on the scene's panel or in a quote it cites; copy 15 to 45 words
    for (const s of Object.values(scenes)) {
      const x = x0.scenes[s.id]
      const quotes = (s.sources ?? []).map(({ file, quote }) => {
        if (!readFileSync(join(roots[pid], file), 'utf8').includes(quote)) fail(`${at0} ${s.id}: the quote "${quote}" is not in ${M.name}'s ${file}`)
        return quote
      })
      const panel = bare(x ? x.wide.flat().join(' ') : '')
      const have = new Set(numbers(panel + ' ' + quotes.join(' ')))
      const prose = [s.title, ...s.copy.map(([t]) => t)].join(' ')
      for (const n of numbers(prose)) if (!have.has(n)) fail(`${at0} ${s.id}: ${n} in the title or copy is neither on the panel nor in a cited quote`)
      // a count ("466 unit tests") must count the same thing as its source, so a number that occurs elsewhere in a quote
      // cannot stand in for it
      const counts = (t) =>
        [...digits(t).matchAll(/(?<![£\d.,A-Za-z-])(\d+(?:,\d{3})*)(?![\d.,%x])[^A-Za-z\d]{0,2}([A-Za-z]+)/g)].map((m) => `${m[1]} ${m[2].toLowerCase()}`)
      const sourced = new Set(counts(panel + ' ' + quotes.join(' ')))
      const sourcedNumbers = new Set(counts(panel + ' ' + quotes.join(' ')).map((c) => c.split(' ')[0]))
      for (const c of counts(prose))
        if (sourcedNumbers.has(c.split(' ')[0]) && !sourced.has(c)) fail(`${at0} ${s.id}: "${c}" in the title or copy does not match what its source counts`)
      const count = s.copy
        .map(([t]) => t)
        .join(' ')
        .split(/\s+/)
        .filter((w) => /\w/.test(w)).length
      if (count < 15 || count > 45) fail(`${at0} ${s.id}: the copy has ${count} words (brief §5: 15 to 45)`)
    }

    // every listed feature sits on visible text in the module's section, or is named as not drawn, with the reason
    const covered = new Set()
    for (const el of children(section, 'data-covers')) if (text(el.html) && !hiddenTag(el.tag)) for (const f of el.value.split(/\s+/)) covered.add(f)
    const notDrawn = spec.notDrawn ?? {}
    for (const [group, n] of Object.entries(M.features))
      for (let i = 1; i <= n; i++) {
        const f = group + i
        if (!covered.has(f) && !notDrawn[f]) fail(`${at0}: feature ${f} of the list is on no visible text (data-covers) and not named as not drawn`)
        if (covered.has(f) && notDrawn[f]) fail(`${at0}: feature ${f} is drawn and also named as not drawn`)
      }
    for (const f of [...covered, ...Object.keys(notDrawn)])
      if (!/^([A-Z])(\d+)$/.test(f) || !(Number(f.slice(1)) <= M.features[f[0]])) fail(`${at0}: ${f} is not on the feature list`)

    // try-it paths: each marked control or email exists in the module; numbers only as the steps enter them
    const stepValues = new Set(numbers(JSON.stringify(steps.scenes)))
    for (const n of spec.needs) {
      for (const [, name] of n.path.matchAll(/\[\[([^\]]+)\]\]/g))
        if (!exists(pid, name)) fail(`${at0} ${n.id}: the path names "${name}", which is not in ${M.name}`)
      for (const num of numbers(n.path.replace(/\[\[[^\]]+\]\]/g, '')))
        if (!stepValues.has(num)) fail(`${at0} ${n.id}: the path's ${num} is not a value the scene steps enter`)
    }
    for (const m of section.matchAll(/<p class="dm-try">([\s\S]*?)<\/p>/g))
      if (!m[1].includes(`href="${M.app}"`)) fail(`${at0}: a try-it link does not open ${M.name}`)
  }
}
