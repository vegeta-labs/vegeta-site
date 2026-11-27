// /explore/ (plan 44): writes site/explore/index.html and site/api/_catalog.mjs from site-src/explore.json.
// Each entry's title and description are copied from the page it links to (its <title> without " | Vegeta" and its meta
// description), so the catalog says nothing the pages do not already say (rule P9). Entries without a page head of their own
// (a home-page section, the Trunks demo package, the feedback form) quote words that appear on a named source page; the build
// fails when they no longer do. The page shell (head, nav, footer) is copied from /policy/, which marks no nav link.
// renderExplore() is also called by scripts/check-site.mjs, which fails when the committed files are not its output.
// Run it after every other generator (it reads their pages), then Prettier on the page:
//   node scripts/build-explore.mjs && npx prettier@3 --write --single-quote --no-semi --print-width 160 site/explore/index.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { formUrl } from './feedback-form.mjs'

const ROOT = join(import.meta.dirname, '..')
export const EXPLORE_TITLE = 'Explore | Vegeta'
export const EXPLORE_DESC = 'Ask about SPVs, syndicates and funds, and get the pages of this site that answer it.'
// the words the page shows in each state of the search box (plan 44 redesign 2026-11-27, E3: no notes; notices live on /policy/)
export const EXPLORE_TEXT = {
  suitability: 'Vegeta can&rsquo;t tell you what suits your situation.',
  none: 'Nothing on this site matches that.',
  paused: 'AI unavailable right now. Try a question below.',
  limit: 'Too many questions right now. Try again in a minute.',
  daily: 'No more questions today. Try one below.',
  invalid: 'Type a few words.',
}
// the fixed links for a question about what suits the visitor (plan 44 §3.4): not chosen per question
export const SUITABILITY_LINKS = ['policy', 'blog']
// what kind of page a row is (E4): a fixed set, shown as a small tag
export const KINDS = { page: 'Page', docs: 'Docs', demo: 'Demo', try: 'Try', story: 'Story', topic: 'Topic', article: 'Article', form: 'Form', site: 'Page' }
// the only short names a row may use instead of its page's own words (E4)
export const SHORT = { page: 'Overview', demo: 'Feature tour', try: 'Live demo' }
// in the Project line the home page is Home, so Overview always means a module's own page (fresh review 2026-11-27)
export const PROJECT_SHORT = { '/': 'Home' }
// what a page is for in an answer (rethink 2026-11-27): one tag per kind, the same in a starter answer and an AI answer
// (site: a page about the project itself, such as FAQ, Blog or Policy; review 2026-11-27: not tagged Module)
export const TAGS = { page: 'Module', docs: 'Docs', demo: 'See it', try: 'Try it', story: 'Read', topic: 'Topic', article: 'Read', form: 'Form', site: 'Page' }
export const EXPLORE_H1 = 'Ask anything about SPVs, syndicates and funds.'

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  nbsp: ' ',
  hellip: '…',
  pound: '£',
}
export const decode = (s) =>
  s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e] ?? m),
  )
// the visible words of a page, one space between words
const words = (h) =>
  decode(
    h
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
const fileOf = (site, url) => join(site, url.split('#')[0].replace(/^\//, ''), 'index.html')

export function renderExplore({
  site = join(ROOT, 'site'),
  spec = JSON.parse(readFileSync(join(ROOT, 'site-src/explore.json'), 'utf8')),
  education = JSON.parse(readFileSync(join(ROOT, 'site-src/education.json'), 'utf8')),
} = {}) {
  const problems = []
  const entries = {}
  for (const [id, e] of Object.entries(spec.entries)) {
    if (!/^[a-z0-9-]+$/.test(id)) problems.push(`${id}: ids are lower-case words and hyphens`)
    const url = e.form ? formUrl(e.form) : e.url
    let title, desc
    if (e.title) {
      // quoted from a source page: every part must still be on it, word for word
      const src = fileOf(site, e.source)
      const text = existsSync(src) ? words(readFileSync(src, 'utf8')) : ''
      for (const part of [e.title, ...e.text]) if (!text.includes(decode(part))) problems.push(`${id}: "${part}" is not on ${e.source}`)
      title = e.title
      desc = e.text.join(' · ')
    } else {
      const f = fileOf(site, url)
      if (!existsSync(f)) {
        problems.push(`${id}: no page at ${url}`)
        continue
      }
      const h = readFileSync(f, 'utf8')
      title = /<title>([^<]*)<\/title>/.exec(h)?.[1].replace(/ \| Vegeta$/, '')
      desc = /<meta\s+name="description"\s+content="([^"]*)"/.exec(h)?.[1]
      if (!title || !desc) problems.push(`${id}: ${url} has no title or meta description`)
    }
    if (e.keys !== undefined && !/^[A-Za-z0-9 ]+$/.test(e.keys)) problems.push(`${id}: keys are plain words`)
    // an article's section headings with their ids (plan 44 rethink: an AI answer can point at the section that answers)
    let heads = []
    if (!e.title && !e.form && /^\/blog\/[a-z0-9-]+\/$/.test(url) && !/^\/blog\/(operations|investors|leads|uk-rules)\/$/.test(url)) {
      const body = /<article class="article">([\s\S]*)<\/article>/.exec(readFileSync(fileOf(site, url), 'utf8'))?.[1] ?? ''
      heads = [...body.matchAll(/<h2 id="([a-z0-9-]+)">([\s\S]*?)<\/h2>/g)].map((m) => [m[1], words(m[2]).replace(/"/g, '')]) // no straight quotes: Prettier would switch the attribute to single quotes
      if (!heads.length) problems.push(`${id}: ${url} has no section headings with ids`)
      for (const [, t] of heads) if (t.includes('|')) problems.push(`${id}: a heading has a | in it`)
    }
    entries[id] = { url, title, desc, keys: e.keys ?? '', heads }
  }

  // the shell (head, nav, footer) comes from /policy/; its footer, then nav, link words are the short names rows may use (not the logo)
  const shell = readFileSync(join(site, 'policy/index.html'), 'utf8')
  const linkText = new Map()
  const chrome = [/<footer class="footer"[\s\S]*?<\/footer>/, /<header class="nav"[\s\S]*?<\/header>/].map((r) => r.exec(shell)?.[0] ?? '').join('')
  for (const [, cls, href, inner] of chrome.matchAll(/<a\b(?:\s+class="([^"]*)")?[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (cls?.includes('nav__brand')) continue
    const t = decode(
      inner
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    if (!linkText.has(href) && t) linkText.set(href, t)
  }

  // one entry per address, so no page can be listed twice under two ids (Codex 2026-11-27)
  const urls = new Map()
  for (const [id, e] of Object.entries(entries)) {
    if (urls.has(e.url)) problems.push(`${id}: same address as ${urls.get(e.url)}`)
    urls.set(e.url, id)
  }
  // where each entry sits on the page: exactly once (redesign R1)
  const placed = new Map()
  const place = (id, where) => {
    if (!Object.hasOwn(entries, id)) return problems.push(`${where}: unknown entry ${id}`)
    if (placed.has(id)) problems.push(`${id}: placed twice (${placed.get(id).where}, ${where})`)
    placed.set(id, { where })
  }
  for (const m of spec.modules)
    for (const [id, kind] of m.rows) {
      if (!Object.hasOwn(KINDS, kind)) problems.push(`${id}: unknown kind ${kind}`)
      place(id, m.name)
    }
  const learn = education.categories.map((c) => ({
    name: c.name,
    topic: `cat-${c.anchor}`,
    items: education.articles.filter((a) => a.category === c.id).map((a) => a.slug),
  }))
  for (const t of learn) for (const id of [t.topic, ...t.items]) place(id, `Learn ${t.name}`)
  for (const id of spec.project) place(id, 'Project')
  for (const id of Object.keys(entries)) if (!placed.has(id)) problems.push(`${id}: placed nowhere`)
  const sits = new Set()
  // a step is an entry, or an article's entry and one of its sections (id#section)
  const checkStep = (ref, key) => {
    const [id, sec] = ref.split('#')
    if (!Object.hasOwn(entries, id)) problems.push(`${key}: unknown entry ${id}`)
    else if (sec !== undefined && !entries[id].heads.some(([h]) => h === sec)) problems.push(`${key}: ${id} has no section ${sec}`)
  }
  for (const role of spec.roles) {
    if (!/^[a-z]+$/.test(role.id)) problems.push(`role ${role.id}: ids are lower-case letters`)
    for (const x of role.situations) {
      const key = `${role.id}-${x.id}`
      if (!/^[a-z0-9-]+$/.test(x.id) || sits.has(key)) problems.push(`situation ${key}: bad or repeated id`)
      sits.add(key)
      if (x.path.length < 2 || x.path.length > 4) problems.push(`situation ${key}: a path has 2 to 4 steps`)
      if (!/\?$/.test(x.q)) problems.push(`situation ${key}: a starter is a question`)
      for (const ref of x.path) checkStep(ref, key)
    }
  }
  // the field's first suggestion (owner 2026-11-27: completes with →): a question with a fixed answer that is not in the lists
  const F = spec.featured
  if (!F || !/^[a-z0-9-]+$/.test(F.id) || !/\?$/.test(F.q) || F.path.length < 2 || F.path.length > 4)
    problems.push('featured: an id, a question and 2 to 4 steps')
  else for (const ref of F.path) checkStep(ref, 'featured')
  if (problems.length) throw new Error(`explore: ${problems.join('; ')}`)

  // what the function sends the model: ids, plain titles and descriptions, and where each entry sits
  const where = (id) => {
    const m = spec.modules.find((m) => m.rows.some(([r]) => r === id))
    if (m) return [decode(`${m.name}: ${m.need}`)]
    const t = learn.find((t) => t.topic === id || t.items.includes(id))
    return [t ? t.name : 'About the project']
  }
  const catalog = {
    // an article's sections let the model point at the one that answers (rethink 2026-11-27, owner: do it now)
    entries: Object.entries(entries).map(([id, e]) => ({
      id,
      title: decode(e.title),
      desc: decode(e.desc),
      groups: where(id),
      ...(e.heads.length ? { sections: e.heads } : {}),
    })),
  }

  const text = (s) => decode(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const attr = (s) => decode(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // an article opened from here gets ?from=explore, so its page offers "← Explore", which goes back in history (owner 2026-11-27)
  const ARTICLES = new Set([
    ...education.articles.map((a) => `/blog/${a.slug}/`),
    ...spec.modules.flatMap((m) => m.rows.filter(([, k]) => k === 'story').map(([id]) => entries[id].url)),
  ])
  const href = (id) => {
    const u = entries[id].url
    return (ARTICLES.has(u) ? `${u}?from=explore` : u).replace(/&(?!amp;)/g, '&amp;')
  }
  const nameOf = (id, kind) => (Object.hasOwn(SHORT, kind) ? SHORT[kind] : (linkText.get(entries[id].url) ?? entries[id].title))
  const kindOf = (id) => (spec.entries[id].form ? 'form' : 'site')
  // where an entry sits: its module, its kind and the short name the map uses
  const info = new Map()
  for (const m of spec.modules)
    for (const [id, kind] of m.rows) info.set(id, { kind, module: m.name, name: kind === 'story' ? entries[id].title : nameOf(id, kind) })
  for (const t of learn) {
    info.set(t.topic, { kind: 'topic', module: '', name: entries[t.topic].title })
    for (const id of t.items) info.set(id, { kind: 'article', module: '', name: entries[id].title })
  }
  for (const id of spec.project)
    info.set(id, { kind: kindOf(id), module: '', name: PROJECT_SHORT[entries[id].url] ?? linkText.get(entries[id].url) ?? entries[id].title })
  // one row, the same in the map, a starter answer and an AI answer: a tag, the name (with its module), the page's own description.
  // In the map the tag is the kind (data-g holds the answer tag); data-s holds the words typing matches, data-h an article's sections
  const inner = (id, tag) => {
    const { module, name } = info.get(id)
    return `<span class="explore__k">${tag}</span> <span class="explore__t">${module ? `<span class="explore__m">${text(module)} · </span>` : ''}${text(name)}</span><span class="explore__d">${text(entries[id].desc)}</span>`
  }
  const row = (id) => {
    const e = entries[id]
    const { kind, module, name } = info.get(id)
    const s = [module, name, e.title, e.desc, e.keys].join(' ')
    const h = e.heads.length ? ` data-h="${attr(e.heads.map(([i, t]) => `${i} ${t}`).join('|'))}"` : ''
    return `<li data-x="${id}" data-g="${TAGS[kind]}" data-s="${attr(s.toLowerCase())}"${h}><a href="${href(id)}">${inner(id, KINDS[kind])}</a></li>`
  }
  const step = (ref) => {
    const [id, sec] = ref.split('#')
    const h = sec && entries[id].heads.find(([s]) => s === sec)
    return `<li><a href="${href(id)}${h ? `#${sec}` : ''}">${inner(id, TAGS[info.get(id).kind])}${h ? `<span class="explore__sh">§ ${text(h[1])}</span>` : ''}</a></li>`
  }

  const modulesHtml = spec.modules
    .map(
      (m) => `<div class="explore__mod">
    <h3>${text(m.name)}</h3>
    <p>${text(m.need)}</p>
    <ul class="explore__rows">
      ${m.rows.map(([id]) => row(id)).join('\n')}
    </ul>
  </div>`,
    )
    .join('\n')
  const learnHtml = learn
    .map(
      (t) => `<details class="explore__topic" id="t-${entries[t.topic].url.split('/')[2]}">
    <summary>${text(t.name)} <span>${t.items.length}</span></summary>
    <ul class="explore__rows">
      ${[t.topic, ...t.items].map(row).join('\n')}
    </ul>
  </details>`,
    )
    .join('\n')
  const projectHtml = spec.project.map(row).join('\n')
  // a starter answer: the question as asked, then its fixed path; without the script the address (#id) shows it
  const answer = (id, x) => `<section class="explore__ans" id="${id}" tabindex="-1" aria-labelledby="${id}-q" data-ans>
      <p class="explore__q" id="${id}-q">${text(x.q)}</p>
      <ol class="explore__rows explore__path">
        ${x.path.map(step).join('\n')}
      </ol>
    </section>`
  const answersHtml = [
    answer(`ask-${spec.featured.id}`, spec.featured),
    ...spec.roles.flatMap((role) => role.situations.map((x) => answer(`${role.id}-${x.id}`, x))),
  ].join('\n')
  const startHtml = spec.roles
    .map(
      (role) => `<div class="explore__role" data-role="${role.id}">
    <h3>${text(role.name)}</h3>
    <ul class="explore__qs">
      ${role.situations.map((x) => `<li><a href="#${role.id}-${x.id}" data-q="${role.id}-${x.id}">${text(x.q)}</a></li>`).join('\n')}
    </ul>
  </div>`,
    )
    .join('\n')
  const state = (k, body) => `<div class="explore__state" data-state="${k}" hidden>${body}</div>`
  const main = `<main id="main">
  <div class="blogindex__intro">
    <p class="eyebrow section-label">Explore</p>
    <h1 class="blogindex__title" id="ex-h">${EXPLORE_H1}</h1>
    <p class="explore__lede">Answers come from the articles and module pages of this site.</p>
  </div>
  <div class="explore" data-ex>
    <section class="explore__ask" aria-labelledby="ex-h" data-explore hidden>
      <form class="explore__form" role="search" data-explore-form>
        <span class="explore__ai" aria-hidden="true">✦</span>
        <label class="sr-only" for="ex-q">Your question</label>
        <div class="explore__in">
          <div class="explore__ghost" aria-hidden="true" data-ghost></div>
          <textarea id="ex-q" name="q" rows="2" maxlength="300" autocomplete="off" enterkeyhint="send" placeholder="${attr(spec.featured.q)}"></textarea>
        </div>
        <span class="explore__count" aria-live="polite" data-count></span>
        <button type="submit" class="explore__go" aria-label="Ask"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
      </form>
      <ul class="explore__rows explore__hints" aria-label="Suggestions" data-hints></ul>
      <p class="sr-only" aria-live="polite" data-explore-status></p>
    </section>
    <div class="explore__answers">
    <section class="explore__ans explore__ans--ai" tabindex="-1" aria-labelledby="ex-aq" data-ai hidden>
      <p class="explore__q" id="ex-aq"><span class="explore__ai" title="Picked by AI from this site’s pages">✦</span> <span data-aq></span></p>
      <ol class="explore__rows explore__path" data-explore-list></ol>
      <div class="explore__out">
        ${state('suitability', `<p>${EXPLORE_TEXT.suitability}</p>\n<ol class="explore__rows explore__path">\n${SUITABILITY_LINKS.map(step).join('\n')}\n</ol>`)}
        ${['none', 'paused', 'limit', 'daily', 'invalid'].map((k) => state(k, `<p>${EXPLORE_TEXT[k]}</p>`)).join('\n')}
      </div>
    </section>
    ${answersHtml}
    </div>
    <section class="explore__start" aria-labelledby="ex-start-h" data-start>
      <h2 class="eyebrow section-label" id="ex-start-h">Start with a question</h2>
      <div class="explore__tabs" role="group" aria-label="Who you are" hidden>
        ${spec.roles.map((role, i) => `<button type="button" aria-pressed="${i ? 'false' : 'true'}" data-tab="${role.id}">${text(role.name)}</button>`).join('\n')}
      </div>
  ${startHtml}
    </section>
    <section class="explore__sec" aria-labelledby="ex-mod-h">
      <h2 class="eyebrow section-label" id="ex-mod-h">All pages · Modules</h2>
      <div class="explore__mods">
  ${modulesHtml}
      </div>
    </section>
    <section class="explore__sec" aria-labelledby="ex-learn-h">
      <h2 class="eyebrow section-label" id="ex-learn-h">Learn</h2>
      <div class="explore__learn">
  ${learnHtml}
      </div>
    </section>
    <section class="explore__sec" aria-labelledby="ex-proj-h">
      <h2 class="eyebrow section-label" id="ex-proj-h">Project</h2>
      <ul class="explore__rows explore__proj">
  ${projectHtml}
      </ul>
    </section>
  </div>
</main>`

  const head = shell
    .slice(0, shell.indexOf('<main'))
    .replace(/<title>[^<]*<\/title>/, `<title>${EXPLORE_TITLE}</title>`)
    .replace(/(name="description"\s+content=")[^"]*"/, `$1${EXPLORE_DESC}"`)
    .replace(/(property="og:title"\s+content=")[^"]*"/, `$1${EXPLORE_TITLE}"`)
    .replace(/(property="og:description"\s+content=")[^"]*"/, `$1${EXPLORE_DESC}"`)
    .replace(/(name="twitter:title"\s+content=")[^"]*"/, `$1${EXPLORE_TITLE}"`)
    .replace(/(name="twitter:description"\s+content=")[^"]*"/, `$1${EXPLORE_DESC}"`)
    .replace(/https:\/\/vegeta-ops\.vercel\.app\/policy\//g, 'https://vegeta-ops.vercel.app/explore/')
    .replace('<script src="/site.js"></script>', '<script src="/site.js"></script>\n    <script src="/explore.js" defer></script>')
  const html = head + main + shell.slice(shell.indexOf('</main>') + '</main>'.length)
  // a module, not JSON: the function imports it, and a plain import needs no import attributes in Vercel's bundler
  return {
    html,
    catalog: `// generated by scripts/build-explore.mjs from site-src/explore.json: do not edit\nexport default ${JSON.stringify(catalog, null, 1)}\n`,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { html, catalog } = renderExplore()
  mkdirSync(join(ROOT, 'site/explore'), { recursive: true })
  mkdirSync(join(ROOT, 'site/api'), { recursive: true })
  writeFileSync(join(ROOT, 'site/explore/index.html'), html)
  writeFileSync(join(ROOT, 'site/api/_catalog.mjs'), catalog)
  console.log('explore: page and catalog written; run Prettier on site/explore/index.html')
}
