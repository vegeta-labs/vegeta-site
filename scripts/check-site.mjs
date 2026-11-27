// Project website checks (docs/en/SITE_HANDBOOK.md §6, §8; plan 13 §8.1 K1–K11). Exits 1 on any failure.
// Pages: / (the Deal Ops overview), /bulma/, /goten/, /trunks/, the blog (plan 22) and /docs/ (plan 30); /trunks/demo/ is Trunks's own demo
// package, checked against its lock.
// - CSP rules in every page: one external script (/site.js), no inline script, no style attribute, no <style>, no inline events
// - every local file a page or the stylesheet refers to exists; every anchor, on the page or on another page, has a target;
//   links go only to the site's own pages, Goten app, the three public repos, the GitHub organisation and the feedback form
// - no page carries a mailto link or an e-mail address (the form replaces them; .example addresses are fine)
// - the footer is the same on every page, links to the feedback form and carries Goten's disclaimer word for word
// - /goten/: the privacy and disclaimer sentences match the app word for word; FAQ rules; trust figures in the release notes
// - /trunks/: every figure is in Trunks release notes; quoted words are Trunks UI text, template text or demo data; the
//   release notes' mailbox test-scope sentences are on the page word for word; FAQ rules
// - /bulma/: every figure is in Bulma's release notes; the words in the hero and step pictures are Bulma UI text or its demo
//   data; each Limits sentence is Bulma's own; FAQ rules
// - /trunks/demo/: the files are exactly the locked release package (hashes), built from trunks.ref; noindex; no inline script;
//   no secrets; only .example e-mail addresses in the snapshot
// - no page says what it must not (unverifiable claims, "in design", and a private list of terms)
// - old links to Goten's sections (/#faq-…) have their target on /goten/ and none on /
// - site/site.js is the current build of site-src/site.js and is ≤ 6 KB gzip (handbook §6)
// - seven step illustrations match their pinned sample data; obsolete clips are rejected
// - the headers file carries the expected CSP
import { checkIllustrations, illustrationPattern } from './check-illustrations.mjs'
import { checkDemos } from './check-demos.mjs'
import { PRODUCTS as DEMO_MODULES } from './build-demos.mjs'
import { computeExample, INPUT as EXAMPLE_INPUT } from './blog-example.mjs'
import { digest, labelsIn } from './education-digest.mjs'
import { NOT_FOUND, releasesOf, renderDocs } from './build-docs.mjs'
import { FEEDBACK_FORM, FORM_URLS, ROLE_OF_CATEGORY, formUrl } from './feedback-form.mjs'
import { renderExplore } from './build-explore.mjs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'
import { runInNewContext } from 'node:vm'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// a date a reader sees, like 7 November 2026: a real calendar day, no leading zero
const isDate = (s) => {
  const m = typeof s === 'string' && /^([1-9]|[12]\d|3[01]) ([A-Z][a-z]+) (20\d\d)$/.exec(s)
  if (!m || !MONTHS.includes(m[2])) return false
  const d = new Date(Date.UTC(+m[3], MONTHS.indexOf(m[2]), +m[1]))
  return d.getUTCDate() === +m[1]
}
const SITE = 'site'
// The apps' sentences, labels and release notes come from the public repos, checked out at the commits in goten.ref,
// trunks.ref and bulma.ref (CI does this; locally: npm run goten:fetch && npm run trunks:fetch && npm run bulma:fetch).
// GOTEN_DIR / TRUNKS_DIR / BULMA_DIR override the location.
const GOTEN = process.env.GOTEN_DIR ?? 'vendor/goten'
const TRUNKS = process.env.TRUNKS_DIR ?? 'vendor/trunks'
const BULMA = process.env.BULMA_DIR ?? 'vendor/bulma'
for (const [dir, file, cmd] of [
  [GOTEN, 'src/config.ts', 'goten:fetch'],
  [TRUNKS, 'CHANGELOG.md', 'trunks:fetch'],
  [BULMA, 'package.json', 'bulma:fetch'],
])
  if (!existsSync(join(dir, file))) {
    console.error(`site check: no checkout in ${dir} (run npm run ${cmd})`)
    process.exit(1)
  }
// a default checkout must be exactly the pinned commit, with no local edits (a failed fetch leaves the old one in place)
const git = (dir, ...a) =>
  execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' })
    .toString()
    .trim()
for (const [env, dir, ref, cmd] of [
  ['GOTEN_DIR', GOTEN, 'goten.ref', 'goten:fetch'],
  ['TRUNKS_DIR', TRUNKS, 'trunks.ref', 'trunks:fetch'],
  ['BULMA_DIR', BULMA, 'bulma.ref', 'bulma:fetch'],
]) {
  if (process.env[env]) continue
  const want = readFileSync(ref, 'utf8').trim()
  if (git(dir, 'rev-parse', 'HEAD') !== want || git(dir, 'status', '--porcelain')) {
    console.error(`site check: ${dir} is not a clean checkout of ${ref} ${want.slice(0, 7)} (run npm run ${cmd})`)
    process.exit(1)
  }
}
// Words no page may contain that must not appear in the public repo either (so they are not written here): kept in
// scripts/private-terms.json in the development repo only, as [["regex source", "flags", "what"], …]; skipped where absent.
const PRIVATE_TERMS = existsSync('scripts/private-terms.json')
  ? JSON.parse(readFileSync('scripts/private-terms.json', 'utf8')).map(([src, flags, what]) => [new RegExp(src, flags), what])
  : []
const problems = []
const fail = (msg) => problems.push(msg)
const read = (f) => readFileSync(f, 'utf8')
const css = read(join(SITE, 'styles.css'))
const BLOG_LIST = '/blog/'
const BLOG_GOTEN = '/blog/from-bank-statement-to-exit/'
const EDUCATION = JSON.parse(read('site-src/education.json'))
const EDU_URLS = EDUCATION.articles.map((a) => `/blog/${a.slug}/`)
// the education articles cite primary and authoritative sources: only these hosts, over https
const EDU_SOURCES =
  /^https:\/\/(www\.legislation\.gov\.uk|www\.gov\.uk|handbook\.fca\.org\.uk|api-handbook\.fca\.org\.uk|www\.fca\.org\.uk|ilpa\.org|www\.investor\.gov|www\.sec\.gov|www\.nber\.org|conference\.nber\.org|www\.ycombinator\.com|www\.law\.cornell\.edu|delcode\.delaware\.gov|rodneywhitecenter\.wharton\.upenn\.edu|nvca\.org|www\.prarulebook\.co\.uk|www\.irs\.gov|www\.fscs\.org\.uk|www\.cambridgeassociates\.com|econpapers\.repec\.org|ideas\.repec\.org|www\.theaic\.co\.uk|www\.privateequityvaluation\.com|www\.nasa\.gov|www\.jstor\.org|www\.bakerdonelson\.com|www\.angelcapitalassociation\.org|media\.mcguirewoods\.com|eprints\.lse\.ac\.uk|academic\.oup\.com|ico\.org\.uk|www\.psr\.org\.uk|www\.ncsc\.gov\.uk|www\.business\.gov\.uk|www\.wearepay\.uk|www\.ukfinance\.org\.uk)\//
const BLOG_TOPICS = EDUCATION.categories.map((c) => `/blog/${c.anchor}/`)
const BLOG_TRUNKS = '/blog/every-investor-email/'
const BLOG_BULMA = '/blog/from-deal-to-payment/'
const BLOGS = [BLOG_LIST, ...BLOG_TOPICS, BLOG_GOTEN, BLOG_TRUNKS, BLOG_BULMA, ...EDU_URLS]
// /docs/ (plan 30): the index and every sidebar item with a route in site-src/docs.json
const DOCS_SPEC = JSON.parse(read('site-src/docs.json'))
const DOCS_ITEMS = DOCS_SPEC.products.flatMap((p) => p.groups.flatMap((g) => g.items.filter((i) => i.route).map((i) => ({ ...i, product: p }))))
// plan 36 C1: /changelog/ is built by the same script from the same pins, so it is checked with the docs pages
const CHANGELOG = '/changelog/'
const POLICY = '/policy/'
// plan 44: the catalog of the site's pages, with a suggestion box
const EXPLORE = '/explore/'
const DOCS = ['/docs/', ...DOCS_ITEMS.map((i) => i.route), CHANGELOG]
for (const url of DOCS)
  if (!(url === CHANGELOG || /^\/docs\/([a-z0-9-]+\/)*$/.test(url)) || !existsSync(join(SITE, url, 'index.html'))) {
    console.error(`site check: docs page ${url} is not built (npm run docs:fetch && node scripts/build-docs.mjs)`)
    process.exit(1)
  }
if (new Set(DOCS).size !== DOCS.length) fail('docs.json: two items share a route')
const PAGES = {
  '/': 'index.html',
  '/bulma/': 'bulma/index.html',
  '/goten/': 'goten/index.html',
  '/trunks/': 'trunks/index.html',
  // plan 42 Demos: a hub and one page per module (checked in scripts/check-demos.mjs)
  '/demos/': 'demos/index.html',
  ...Object.fromEntries(DEMO_MODULES.map((m) => [`/demos/${m}/`, `demos/${m}/index.html`])),
  // plan 43: the one page for the notices the other pages no longer repeat
  [POLICY]: 'policy/index.html',
  [EXPLORE]: 'explore/index.html',
  ...Object.fromEntries([...BLOGS, ...DOCS].map((url) => [url, url.slice(1) + 'index.html'])),
  // what Vercel serves for an address that does not exist (plan 36 D7): held to the same markup, nav and footer rules
  [NOT_FOUND]: NOT_FOUND.slice(1),
}
const html = Object.fromEntries(Object.entries(PAGES).map(([url, f]) => [url, read(join(SITE, f))]))
const plain = (h) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
const idsOf = (h) => [...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Current trust figures must come from the pinned release, never an older CHANGELOG section.
const trunksVersion = JSON.parse(read(join(TRUNKS, 'package.json'))).version
const releaseSection = (notes, v) => (new RegExp(`^## v${esc(v)}\\b[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm').exec(notes) ?? [''])[0]
const trunksNotesRaw = read(join(TRUNKS, 'CHANGELOG.md'))
const currentInboxNotes = releaseSection(trunksNotesRaw, trunksVersion)
if (!currentInboxNotes) fail(`Trunks release notes have no section for v${trunksVersion}`)
// A presentation-only patch may quote unchanged results from its explicitly named measured release.
const trunksMeasuredVersion = /were \*\*measured on v([0-9.]+)\*\*/.exec(currentInboxNotes)?.[1] ?? trunksVersion
const measuredInboxNotes = releaseSection(trunksNotesRaw, trunksMeasuredVersion)
if (!measuredInboxNotes) fail(`Trunks measurement release v${trunksMeasuredVersion} is missing`)
if (trunksMeasuredVersion !== trunksVersion) {
  // every row's threshold and result, in order; a row's label may be reworded (v0.4.0 names "the v0.3.0 scoring fix")
  // the metric table only: v0.5.0's notes also hold a table of renamed names
  const table = (s) =>
    (/^\| Metric \|[\s\S]*?(?=\n(?!\s*\|)|$)/m.exec(s)?.[0] ?? '')
      .split('\n')
      .filter((line) => /^\s*\|/.test(line))
      .map((line) => line.split('|').slice(2).join('|').trim())
      .join('\n')
  if (table(currentInboxNotes) !== table(measuredInboxNotes)) fail('Trunks carried-forward metric table differs from its measured release')
}
const metricCell = (label) => {
  const cell = new RegExp(`^\\s*\\| ${esc(label)} \\|[^|]+\\|\\s*([^|]+)\\|`, 'm').exec(currentInboxNotes)?.[1]?.trim()
  if (!cell) fail(`Trunks v${trunksVersion}: missing metric ${label}`)
  return cell ?? ''
}
const fractionFigure = (label) => {
  const m = /^100% \((\d+)\/(\d+)\)$/.exec(metricCell(label))
  if (!m || m[1] !== m[2] || Number(m[2]) === 0) {
    fail(`Trunks v${trunksVersion}: ${label} is not a measured perfect-recall fraction`)
    return ''
  }
  return `${m[1]} / ${m[2]}`
}
const trunksTrust = {
  high: fractionFigure('High-risk emails rated high'),
  malicious: fractionFigure('Malicious bank-detail changes or look-alike senders rated high'),
  injection: fractionFigure('Prompt injection does not change the judgement (vs. a clean twin)'),
  classification: metricCell('Classification, macro F1'),
}
if (!/^0\.\d{3}$|^1\.000$/.test(trunksTrust.classification)) fail(`Trunks v${trunksVersion}: invalid classification figure`)
// Bulma (plan 39): figures come from the section of docs/en/RELEASE_NOTES.md for the package version, which is the newest
const bulmaVersion = JSON.parse(read(join(BULMA, 'package.json'))).version
const bulmaNotesRaw = existsSync(join(BULMA, 'docs/en/RELEASE_NOTES.md')) ? read(join(BULMA, 'docs/en/RELEASE_NOTES.md')) : ''
const bulmaNotes = releaseSection(bulmaNotesRaw, bulmaVersion)
if (!bulmaNotes) fail(`Bulma release notes (docs/en/RELEASE_NOTES.md) have no section for v${bulmaVersion}`)
// a figure is backed when one line of that section (not a heading) has it as a whole number and shares a word of five or
// more letters with what the site says it measures, so a date or a count of something else does not back it
const bulmaNoteLines = bulmaNotes
  .split('\n')
  .filter((l) => l.trim() && !/^\s*#/.test(l))
  .map((l) =>
    plain(l.replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'))
      .replace(/\s+/g, ' ')
      .toLowerCase(),
  )
const bulmaBacked = (figure, label) => {
  const re = new RegExp(`(?<!\\d|\\d[.,])${esc(figure.toLowerCase())}(?!\\d|[.,]\\d)`)
  const words = label.toLowerCase().match(/[a-z]{5,}/g) ?? []
  // the figure's own line must share a word with its label, and the label must not borrow a word that only another
  // figure's line has (so 1,130 cannot be called "browser tests"): audit 2026-11-20 K2
  const own = bulmaNoteLines.filter((l) => re.test(l))
  // what another figure measures: the name before the colon of a "- name: count" line
  const others = bulmaNoteLines.filter((l) => !re.test(l) && /^- [^:]+: .*\d/.test(l)).map((l) => l.slice(2, l.indexOf(':')))
  return own.some((l) => words.some((w) => l.includes(w)) && !words.some((w) => !l.includes(w) && others.some((o) => o.includes(w))))
}
let bulmaLatest = null
try {
  bulmaLatest = releasesOf(bulmaNotesRaw)[0] ?? null
} catch (e) {
  fail(`Bulma release notes: ${e.message}`)
}
if (bulmaNotes && bulmaLatest?.version !== `v${bulmaVersion}`) fail('Bulma: the newest release in docs/en/RELEASE_NOTES.md is not the package version')
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{}(),])\/\/.*$/gm, '$1')
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))

// Trunks demo snapshot: its case ids are the targets of /trunks/demo/#case=… links
const DEMO = join(SITE, 'trunks/demo')
let snapshot = null
try {
  const box = {}
  runInNewContext(read(join(DEMO, 'data/snapshot.js')), { globalThis: box })
  snapshot = box.TRUNKS_DEMO
} catch (e) {
  fail(`cannot read the demo snapshot: ${e.message}`)
}
const demoCases = new Set(Object.keys(snapshot?.details ?? {}))

// Validate all illustration text before excluding it from the page-level release-figure inventory.
try {
  checkIllustrations({ html, css, goten: GOTEN, trunks: TRUNKS, snapshot, fail })
} catch (error) {
  fail(`cannot validate illustration sources: ${error.message}`)
}
// plan 42 Demos page: the Goten scenes against the text extracted from the app at goten.ref
try {
  checkDemos({ pages: Object.fromEntries(Object.entries(html).filter(([u]) => u.startsWith('/demos/'))), goten: GOTEN, trunks: TRUNKS, bulma: BULMA, fail })
} catch (error) {
  fail(`cannot check the Demos page: ${error.message}`)
}

// K6, K11: what no page may say
const NO_CLAIMS = [
  ...PRIVATE_TERMS,
  [/\bcompliant\b|\bcompliance-ready\b/i, '"compliant"'],
  [/saves? (you )?time/i, 'a time-saving claim'],
  [/\bAI replies\b|\bAI-written\b/i, '"AI replies"'],
  [/\bin design\b/i, '"in design"'],
  [/\b(100% )?accurate\b/i, '"accurate"'],
]
// ---- K1, K2: every page ----
const EXTERNAL =
  /^https:\/\/(vegeta-ops\.vercel\.app(\/|$)|vegeta-goten\.vercel\.app(\/|$)|deal-ops-toolkit\.vercel\.app(\/|$)|github\.com\/vegeta-labs\/(bulma|goten|trunks)(\/|$)|github\.com\/vegeta-labs$)/
// encoded addresses display as real ones, so the address scan reads them decoded
const decodeForScan = (t) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(+n, 0x10ffff)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&commat;/gi, '@')
    .replace(/&period;/gi, '.')
    .replace(/%40/g, '@')
const flatTags = (h) => h.replace(/\s+/g, ' ').replace(/ ?(<|>) ?/g, '$1')
const footers = new Set()
for (const [url, h] of Object.entries(html)) {
  const at = (m) => `${url}: ${m}`
  const scripts = [...h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  // /explore/ alone also loads its own script, after site.js (plan 44 §4)
  const wantScripts = url === EXPLORE ? ['/site.js', '/explore.js'] : ['/site.js']
  if (
    (h.match(/<script\b/gi) ?? []).length !== wantScripts.length ||
    scripts.length !== wantScripts.length ||
    scripts.some(([, attrs, body], i) => !new RegExp(`\\bsrc="${wantScripts[i].replace('.', '\\.')}"`).test(attrs) || body.trim())
  )
    fail(at(`page must have exactly ${wantScripts.map((s) => `<script src="${s}">`).join(' then ')} and no inline script`))
  // an iPhone will not play a video whose page lists a caption track; captions go in data-captions and site.js adds the track (2026-11-11)
  if (/<track\b/i.test(h)) fail(at('a <track> in the page stops the video playing on iPhones: use data-captions on the <video>'))
  if (/\sstyle\s*=/i.test(h)) fail(at('page has a style attribute'))
  if (/<style\b/i.test(h)) fail(at('page has a <style> element'))
  if (/\son[a-z]+\s*=/i.test(h)) fail(at('page has an inline event handler'))
  // every attribute value is double-quoted, so the reference scan below sees every reference
  for (const [tag] of h.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<[a-z][^>]*>/gi))
    if (/=\s*(?!")/.test(tag.replace(/"[^"]*"/g, '""'))) fail(at(`an attribute value is not double-quoted: ${tag.slice(0, 60)}`))
  const ids = idsOf(h)
  for (const d of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) fail(at(`duplicate id: ${d}`))
  for (const [, ref] of h.matchAll(/\b(?:src|href|srcset|poster)\s*=\s*"([^"]+)"/gi)) {
    if (/^(https?:|mailto:)/.test(ref)) {
      if (!FORM_URLS.includes(ref) && !EXTERNAL.test(ref) && !(EDU_URLS.includes(url) && EDU_SOURCES.test(ref))) fail(at(`unexpected external link: ${ref}`))
      continue
    }
    let [path, hash] = ref.split('#')
    // plan 44 (owner 2026-11-27): /explore/ marks the articles it opens with ?from=explore[:situation], so they can offer the way back
    const from = /\?from=explore(?::([a-z0-9-]+))?$/.exec(path ?? '')
    if (from) {
      if (url !== EXPLORE || !EDU_URLS.concat(BLOG_GOTEN, BLOG_TRUNKS, BLOG_BULMA).includes(path.slice(0, from.index)))
        fail(at(`${ref}: only /explore/ marks its links, and only to articles`))
      else if (from[1] && !ids.includes(from[1])) fail(at(`${ref}: no situation ${from[1]} on /explore/`))
      path = path.slice(0, from.index)
    }
    if (!path) {
      if (!ids.includes(hash)) fail(at(`anchor #${hash} has no target`))
      continue
    }
    if (!path.startsWith('/')) fail(at(`local reference ${ref} must start with / (pages live at different depths)`))
    if (path.endsWith('/')) {
      if (
        ![
          '/',
          '/bulma/',
          '/goten/',
          '/trunks/',
          '/trunks/demo/',
          '/bulma/demo/',
          '/demos/',
          ...DEMO_MODULES.map((m) => `/demos/${m}/`),
          POLICY,
          EXPLORE,
          ...BLOGS,
          ...DOCS,
        ].includes(path)
      )
        fail(at(`link to an unknown page ${path}`))
      if (!hash) continue
      if (path === '/trunks/demo/') {
        const id = /^case=(.+)$/.exec(hash)?.[1]
        if (!id || !demoCases.has(id)) fail(at(`${ref}: no Case ${id} in the demo snapshot`))
      } else if (!idsOf(html[path]).includes(hash)) fail(at(`${ref}: #${hash} has no target on ${path}`))
    } else if (!existsSync(join(SITE, path))) fail(at(`missing file: ${path}`))
  }
  // the footer is the same everywhere
  footers.add(/<footer[\s\S]*<\/footer>/.exec(h)?.[0] ?? '')
  // one page head (plan 33): outside the three product openings, the title follows a dot label
  if (
    !['/', '/bulma/', '/goten/', '/trunks/', '/trunks/demo/'].includes(url) &&
    ((h.match(/<h1\b/g) ?? []).length !== 1 || !/<p class="(?:eyebrow section-label|article__kicker|docs__kicker)">(?:(?!<\/p>)[\s\S])*<\/p>\s*<h1\b/.test(h))
  )
    fail(at('the page needs one h1, right after a dot label (eyebrow, article__kicker or docs__kicker)'))
  const text = plain(h)
  // readers reach the project through the form, so no address on any page; this file is public, so it names none either
  const decoded = decodeForScan(h)
  if (/mailto:/i.test(decoded)) fail(at('page has a mailto link'))
  for (const [email] of decoded.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) if (!email.endsWith('.example')) fail(at(`e-mail address on the page: ${email}`))
  for (const [re, what] of NO_CLAIMS) if (re.test(text)) fail(at(`page mentions ${what}`))
}
if (footers.size !== 1) fail('the footer differs between pages')
// plan 37 A: the pages' old addresses redirect for good: the locked demo package and both product READMEs link them
{
  const redirects = JSON.parse(read(join(SITE, 'vercel.json'))).redirects ?? []
  for (const [source, destination] of [
    ['/toolkit', '/goten/'],
    ['/toolkit/', '/goten/'],
    ['/inbox', '/trunks/'],
    ['/inbox/', '/trunks/'],
    ['/inbox/demo', '/trunks/demo/'],
    ['/inbox/demo/', '/trunks/demo/'],
  ])
    if (!redirects.some((r) => r.source === source && r.destination === destination && r.permanent === true))
      fail(`vercel.json: ${source} must redirect permanently to ${destination}`)
}
// the public snapshot refuses Chinese text; on the site it exists only in the demo package and in the Release notes pages,
// which are the products' own public text (scripts/public-snapshot.mjs skips the rule for exactly those)
for (const [url, h] of Object.entries(html))
  if (/[\u4e00-\u9fff]/.test(h) && !/^\/docs\/[a-z]+\/release-notes\/$/.test(url)) fail(`${url}: Chinese text on the page`)
// plan 37 C: the app's address is vegeta-goten.vercel.app. The old address redirects and survives only inside the docs
// pages' text, which is the product repo's own at the docs pin (its release notes name the address that was live then)
for (const [url, h] of Object.entries(html))
  if ((DOCS.includes(url) ? ([...footers][0] ?? '') + (/<header class="nav"[\s\S]*?<\/header>/.exec(h)?.[0] ?? '') : h).includes('deal-ops-toolkit.vercel.app'))
    fail(`${url}: links the app's old address`)
if (![...footers][0]?.includes(`<a href="${FEEDBACK_FORM}">Feedback</a>`)) fail('the footer has no Feedback link to the form')
// the footer leads to the site's own changelog, which is built from each module's release notes (plan 36 C3; it replaces
// the two links to the notes on GitHub of plan 34 C), and no footer link points at a release tag
if (![...footers][0]?.includes('<a href="/changelog/">Changelog</a>')) fail('the footer must link the changelog')
if (/\/releases\/tag\//.test([...footers][0] ?? '')) fail('the footer must not link a release tag')
{
  const headers = Object.entries(html).map(([url, h]) => [url, /<header class="nav"[\s\S]*?<\/header>/.exec(h)?.[0] ?? ''])
  if (new Set(headers.map(([, h]) => h.replace(/\s+aria-current="page"/g, ''))).size !== 1) fail('the global nav differs between pages (plan 14 R1)')
  // plan 41 §3.1 (owner 2026-11-20): the bar names who each module is for, a native <details> menu per role: Investors
  // (Bulma) and Operations (Goten, Trunks), and no module link of its own; the phone menu lists the same modules under the
  // same names, between Overview and Why trust it; a menu's summary is never itself the current page
  {
    const MENUS = [
      ['Investors', [['/bulma/', 'Bulma', 'SPV Workspace']]],
      [
        'Operations',
        [
          ['/goten/', 'Goten', 'Deal Calculations'],
          ['/trunks/', 'Trunks', 'Operations Inbox'],
        ],
      ],
    ]
    const wantBar = MENUS.map(
      ([label, ms]) =>
        `<details class="nav__mods" data-menu> <summary>${label}</summary> <div class="nav__panel"> ${label === 'Investors' ? '<div role="group" aria-labelledby="nav-spvs"> <p class="nav__label" id="nav-spvs">SPVs</p> ' : ''}${ms.map(([href, n, w]) => `<a href="${href}">${n} <span>${w}</span></a>`).join(' ')}${label === 'Investors' ? ' </div>' : ''} </div> </details>`,
    ).join(' ')
    const wantMenu = [
      '<a href="/">Overview</a>',
      ...MENUS.flatMap(([label, ms]) => [label, ...ms.map(([href, n, w]) => `<a href="${href}">${n} — ${w}</a>`)]),
      '<a href="/#build">Why trust it</a>',
    ]
    for (const [url, h] of headers) {
      if (!h) continue
      const bar = /<nav class="nav__links[\s\S]*?<\/nav>/.exec(h)?.[0] ?? ''
      if (/<summary\s[^>]*>/.test(bar)) fail(`${url}: a nav menu's summary carries attributes; it is never the current page (plan 41)`)
      const menus = (bar.replace(/\s+aria-current="page"/g, '').match(/<details class="nav__mods"[\s\S]*?<\/details>/g) ?? []).map((d) =>
        d.replace(/\s+/g, ' '),
      )
      if (menus.join(' ') !== wantBar) fail(`${url}: the nav bar does not hold the Investors and Operations menus with their modules in order (plan 41)`)
      if (/\shref="\/(bulma|goten|trunks)\b/.test(bar.replace(/<details[\s\S]*?<\/details>/g, '')))
        fail(`${url}: the nav bar links a module outside its menu (plan 41)`)
      const menu = /<details class="nav__menu" data-menu>[\s\S]*?<\/details>/.exec(h)?.[0] ?? ''
      const items = [...menu.replace(/\s+aria-current="page"/g, '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim())
      if (items.slice(0, wantMenu.length).join() !== wantMenu.join())
        fail(`${url}: the phone menu does not list Overview, the modules under Investors and Operations, then Why trust it (plan 41)`)
    }
  }

  for (const [url, h] of headers) {
    // every page of the blog marks Blog (plan 29), every docs page Docs (plan 30), the other pages themselves
    const current = BLOGS.includes(url) ? BLOG_LIST : DOCS.includes(url) ? '/docs/' : url.startsWith('/demos/') ? '/demos/' : url
    const marked = [...h.matchAll(/<a\b[^>]*>/g)].filter((m) => /\saria-current=/.test(m[0])).map((m) => /\shref="([^"]+)"/.exec(m[0])?.[1] ?? '?')
    // the not-found page and /policy/ (reached from the footer, plan 43) are no pages of the nav: they mark nothing
    if (url === NOT_FOUND || url === POLICY || url === EXPLORE) {
      if (marked.length) fail(`${url}: marks ${marked.join(', ')} as the current page, but it is no page of the nav`)
      continue
    }
    if (!marked.length || marked.some((m) => m !== current)) fail(`${url}: the global nav marks ${marked.join(', ') || 'nothing'} as the current page`)
    // every link to this page in the nav (the bar and the phone menu) carries the mark
    // (the brand links home on every page and is not a current-page link)
    for (const [tag] of h.matchAll(/<a\b[^>]*>/g))
      if (!/nav__brand/.test(tag) && /\shref="([^"]+)"/.exec(tag)?.[1] === current && !/\saria-current="page"/.test(tag))
        fail(`${url}: a nav link to this page lacks aria-current`)
  }
  for (const url of ['/bulma/', '/goten/', '/trunks/']) {
    const sub = /<nav class="nav subnav"[^>]*data-subnav>[\s\S]*?<\/nav>/.exec(html[url])?.[0] ?? ''
    if (!sub || !/<body class="has-subnav">/.test(html[url])) fail(`${url}: no sub-nav (plan 14 R1)`)
    for (const [, a] of sub.matchAll(/href="#([^"]+)"/g)) if (!idsOf(html[url]).includes(a)) fail(`${url}: sub-nav link #${a} has no target`)
    // plan 36 N1: the module's own nav leads to that module's docs; N2, N3: the page's text links the site's docs pages,
    // never the same document on GitHub
    const docsHome = `/docs${url}`
    if (!sub.includes(`<a href="${docsHome}">Docs</a>`)) fail(`${url}: the sub-nav has no Docs link to ${docsHome}`)
    if (/github\.com\/vegeta-labs\/[a-z]+\/blob\/[^"]+\/docs\/en\/(use|build)?[^"]*\.md"/.test(html[url].replace(/REVIEW_SUMMARY\.md/g, '')))
      fail(`${url}: links a docs page on GitHub; link the page under ${docsHome}`)
  }
  if (/data-subnav/.test(html['/'])) fail('/: the overview has no sub-nav')
  // plan 36 N5: the module pages' own nav, in this order
  const subLabels = (url) =>
    [.../<nav class="nav subnav"[^>]*data-subnav>[\s\S]*?<\/nav>/.exec(html[url])[0].matchAll(/<a href="[^"]+">([^<]+)<\/a>/g)].map((m) => m[1]).join(' · ')
  for (const [url, want] of [
    ['/bulma/', 'How it works · Why trust it · Limits · Bulma FAQ · Docs'],
    ['/goten/', 'How it works · Why trust it · How we check · Goten FAQ · Docs'],
    ['/trunks/', 'How it works · Why trust it · Use cases · Security · Trunks FAQ · Docs'],
  ])
    if (!subLabels(url).endsWith(want)) fail(`${url}: the sub-nav must read ${want}`)
  // plan 36 N3: these answers lead to their docs page
  for (const [id, page] of [
    ['faq-import', '/docs/goten/use/import-csv/'],
    ['faq-export', '/docs/goten/use/exports-and-records/'],
    ['faq-withdraw', '/docs/goten/use/withdrawal-and-fee-payer/'],
    ['faq-fees', '/docs/goten/use/withdrawal-and-fee-payer/'],
    ['faq-right', '/docs/goten/use/how-the-numbers-work/'],
  ])
    if (!new RegExp(`id="${id}">[\\s\\S]*?</details>`).exec(html['/goten/'])?.[0].includes(`href="${page}"`)) fail(`/goten/: #${id} must link ${page}`)
  // plan 36 A2, A3: the way to the feedback form is the last row of the overview's FAQ and a line under each education
  // article; the closing section keeps its two ways to try the modules and nothing else
  const formLink = `<a href="${FEEDBACK_FORM}">Tell us what you need`
  // plan 36 §12.4: a page that is about one product preselects it in the form, an education article for investors or for
  // leads preselects who the reader is; every other link to the form, the footer's among them, preselects nothing
  const formOn = {
    '/bulma/': formUrl({ product: 'Bulma' }),
    '/goten/': formUrl({ product: 'Goten' }),
    '/trunks/': formUrl({ product: 'Trunks' }),
    '/blog/from-bank-statement-to-exit/': formUrl({ product: 'Goten' }),
    '/blog/every-investor-email/': formUrl({ product: 'Trunks' }),
    [BLOG_BULMA]: formUrl({ product: 'Bulma' }),
  }
  for (const a of EDUCATION.articles) formOn[`/blog/${a.slug}/`] = formUrl({ role: ROLE_OF_CATEGORY[a.category] })
  for (const [url, h] of Object.entries(html)) {
    const footer = /<footer class="footer"[\s\S]*?<\/footer>/.exec(h)?.[0] ?? ''
    const want = formOn[url] ?? FEEDBACK_FORM
    for (const [, ref] of h.replace(footer, '').matchAll(/href\s*=\s*"(https:\/\/docs\.google\.com\/forms\/[^"]*)"/gi))
      if (ref !== want) fail(`${url}: the link to the feedback form should be ${want}`)
    for (const [, ref] of footer.matchAll(/href\s*=\s*"(https:\/\/docs\.google\.com\/forms\/[^"]*)"/gi))
      if (ref !== FEEDBACK_FORM) fail(`${url}: the footer's link to the feedback form preselects nothing`)
  }
  const faqEnd = /<h3 class="faq__h">Not answered here\?<\/h3>\s*<p class="faq__ask">([\s\S]*?)<\/p>\s*<\/div>\s*<\/section>/.exec(html['/'])?.[1] ?? ''
  if (!flatTags(faqEnd).includes(formLink)) fail('/: the FAQ must end with "Not answered here?" and the link to the feedback form')
  const closing = /<section class="cta"[\s\S]*?<\/section>/.exec(html['/'])?.[0] ?? ''
  // plan 41: the close is the suite's, not one module's: one button per module, to its page, nothing else
  const CLOSING = ['/bulma/', '/goten/', '/trunks/']
  if ([...closing.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1]).join() !== CLOSING.join())
    fail(`/: the closing section links exactly ${CLOSING.join(', ')}, in that order (plan 41)`)
  for (const url of EDU_URLS)
    if (!flatTags(html[url]).includes(`<p class="article__ask">Not answered here?<a href="${formOn[url]}">Tell us what you need`))
      fail(`${url}: no "Tell us what you need" line`)
  // the overview links the changelog, never a release tag
  if (/\/releases\/tag\//.test(html['/'])) fail('/: the overview must not link a release tag (link /changelog/)')
}
for (const sheet of ['styles.css', 'docs.css']) {
  const fromCss = [...read(join(SITE, sheet)).matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]).filter((u) => !/^(data:|#)/.test(u))
  for (const f of fromCss) if (!existsSync(join(SITE, f))) fail(`${sheet}: missing file ${f}`)
}

// ---- Plan 30: /docs/. Every page in docs.json is built from its product's public repo at the docs pin, says that version, and
// lists the same sidebar; only docs pages (and /demos/, which shows the docs index's module cards) load docs.css; source links on GitHub point at the pinned commit. ----
{
  const sheet = '<link rel="stylesheet" href="/docs.css" />'
  for (const [url, h] of Object.entries(html))
    if (h.includes(sheet) !== (DOCS.includes(url) || url === NOT_FOUND || url === '/demos/')) fail(`${url}: docs.css on the wrong pages`)
  for (const p of DOCS_SPEC.products) {
    const items = p.groups.flatMap((g) => g.items)
    if (!items.some((i) => i.route)) continue
    if (!/^https:\/\/github\.com\/vegeta-labs\/[a-z-]+$/.test(p.source?.repo ?? '') || !/^[0-9a-f]{40}$/.test(p.source?.ref ?? ''))
      fail(`docs.json: ${p.name} needs a public repo and a full commit id`)
    const sidebar = items.map((i) => (i.route ? `<a href="${i.route}"` : `<span>${esc(i.title)}</span>`))
    for (const i of items.filter((x) => x.route)) {
      const h = html[i.route]
      if (
        !h.includes(`<p class="docs__version">${p.version}</p>`) ||
        !h.includes(
          `<p class="docs__kicker"><a href="${items.find((x) => x.route).route}"${i.route === items.find((x) => x.route).route ? ' aria-current="page"' : ''}>${p.name}</a></p>`,
        )
      )
        fail(`${i.route}: does not say ${p.name} ${p.version}`)
      const whole = /<nav class="docs__side"[\s\S]*?<\/nav>/.exec(h)?.[0] ?? ''
      // plan 36 §11 F3c: a release notes page lists each release under its item, in the order of the notes
      const sub = /<ul class="docs__sub">[\s\S]*?<\/ul>/.exec(whole)?.[0] ?? ''
      const side = whole.replace(sub, '')
      if (sidebar.some((s) => !side.includes(s)) || (side.match(/<li>/g) ?? []).length !== items.length)
        fail(`${i.route}: the sidebar is not the docs.json list`)
      // counted from the notes and resolved against the page, not with releasesOf, which builds the list
      const hrefs = [...sub.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
      const count = i.source === p.source.notes ? (read(join('vendor/docs', p.id, p.source.notes)).match(/^## v\d/gm) ?? []).length : 0
      if (hrefs.length !== count || hrefs.some((id) => !h.includes(`<h2 id="${id}">`))) fail(`${i.route}: the sidebar's releases are not the release notes`)
      if (!new RegExp(`<a href="${esc(i.route)}" aria-current="page">`).test(side)) fail(`${i.route}: the sidebar does not mark this page`)
      for (const [, ref] of h.matchAll(/href="(https:\/\/github\.com\/vegeta-labs\/[a-z-]+\/blob\/[^"/]+)\//g))
        if (/<main\b[\s\S]*<\/main>/.exec(h)[0].includes(ref) && ref !== `${p.source.repo}/blob/${p.source.ref}`)
          fail(`${i.route}: a source link not at the docs pin: ${ref}`)
    }
  }
  // the committed pages are what the shared renderer makes from the public repo at the pin (npm run docs:fetch). Prettier
  // only re-indents, so both sides are compared with whitespace normalised: runs collapse, none next to a tag edge.
  let docsBuilt = true
  for (const p of DOCS_SPEC.products) {
    if (!p.groups.some((g) => g.items.some((i) => i.route))) continue
    const dir = join('vendor/docs', p.id)
    if (!existsSync(join(dir, '.git')) || git(dir, 'rev-parse', 'HEAD') !== p.source?.ref || git(dir, 'status', '--porcelain')) {
      fail(`${dir} is not a clean checkout of the docs pin ${String(p.source?.ref).slice(0, 7)} (run npm run docs:fetch)`)
      docsBuilt = false
      continue
    }
    // each product names its release notes file (Goten docs/RELEASE_NOTES.md, Trunks CHANGELOG.md)
    const notesFile = /^[A-Za-z0-9_/-]+\.md$/.test(p.source?.notes ?? '') ? p.source.notes : ''
    const notes = notesFile && existsSync(join(dir, notesFile)) ? read(join(dir, notesFile)) : ''
    if (!new RegExp(`^## ${esc(p.version)} `, 'm').test(notes)) {
      fail(`docs: ${p.name} ${p.version} is not in ${notesFile || 'its release notes file'} at the docs pin`)
      docsBuilt = false
    }
  }
  if (docsBuilt) {
    const flat = (h) =>
      h
        .replace(/\s+/g, ' ')
        .replace(/ ?(<|>) ?/g, '$1')
        .replace(/ ?\/>/g, '>')
    try {
      const { pages, markdown, llms, notFound } = renderDocs()
      if (flat(html[NOT_FOUND]) !== flat(notFound)) fail(`${NOT_FOUND}: not what scripts/build-docs.mjs makes`)
      if (!/<meta name="robots" content="noindex" \/>/.test(html[NOT_FOUND]) || /rel="canonical"/.test(html[NOT_FOUND]))
        fail(`${NOT_FOUND}: must be noindex and carry no canonical address`)
      if (JSON.stringify(pages.map(([r]) => r).sort()) !== JSON.stringify([...DOCS].sort())) fail('docs: the built pages are not the docs.json list')
      for (const [route, built] of pages)
        if (html[route] && flat(html[route]) !== flat(built)) fail(`${route}: not what scripts/build-docs.mjs makes from the docs pin`)
      // plan 31: each page's Markdown and /llms.txt, byte for byte, and no other Markdown under /docs/
      const wanted = new Map(markdown)
      const served = walk(SITE)
        .filter((f) => f.endsWith('.md'))
        .map((f) => '/' + relative(SITE, f))
      for (const path of served) if (!wanted.has(path)) fail(`${path}: Markdown that is not a docs page`)
      for (const [path, text] of wanted)
        if (!existsSync(join(SITE, path)) || read(join(SITE, path)) !== text) fail(`${path}: not what scripts/build-docs.mjs makes from the docs pin`)
      if (!existsSync(join(SITE, 'llms.txt')) || read(join(SITE, 'llms.txt')) !== llms) fail('/llms.txt: not what scripts/build-docs.mjs makes from docs.json')
      for (const path of wanted.keys()) if (!llms.includes(`https://vegeta-ops.vercel.app${path})`)) fail(`/llms.txt: ${path} is not listed`)
      for (const [path, text] of [...wanted, ['/llms.txt', llms]]) for (const [re, label] of PRIVATE_TERMS) if (re.test(text)) fail(`${path}: ${label}`)
      // the raw files must lead only to the site or the web: a relative link or a reference definition was not rewritten
      for (const [path, text] of [...wanted, ['/llms.txt', llms]]) {
        for (const m of text.matchAll(/\]\(\s*<?([^)\s>]*)/g)) if (!/^(https?:\/\/|#|mailto:)/.test(m[1])) fail(`${path}: link not rewritten: ${m[1]}`)
        if (/^ {0,3}\[[^\]]+\]:\s/m.test(text)) fail(`${path}: a reference-style link definition is not rewritten`)
      }
    } catch (e) {
      fail(`docs: cannot render the pages from the docs pin: ${e.message}`)
    }
  }
  const index = html['/docs/']
  for (const p of DOCS_SPEC.products) {
    const home = p.groups.flatMap((g) => g.items).find((i) => i.route)
    // the card is the one way in (scripts/hub-cards.mjs): a link to the module's first docs page, its miniature naming each
    // sidebar group, and nothing under it repeats them as links
    const card = /<a class="docs-card hub-card hub-card--doc docs-card--([a-z]+)" href="([^"]+)"[\s\S]*?<\/a>/g
    const mine = [...flatTags(index).matchAll(card)].find((m) => m[1] === p.id)
    if (!home || !mine || mine[2] !== home.route) fail(`/docs/: no card for ${p.name}`)
    const groups = p.groups.filter((g) => g.items.some((i) => i.route)).map((g) => esc(g.label))
    for (const g of groups) if (!mine?.[0].includes(`<span class="hub-side__l">${g}</span>`)) fail(`/docs/: the ${p.name} card must name its docs groups`)
  }
}

// app sentences, word for word (Goten src/config.ts, R-X-02 / R-X-03)
const config = read(join(GOTEN, 'src/config.ts'))
const sentence = (name) => new RegExp(`${name}\\s*=\\s*\\n?\\s*'([^']+)'`).exec(config)?.[1]
const PRIVACY = sentence('PRIVACY_TEXT')
const DISCLAIMER = sentence('DISCLAIMER_TEXT')
if (!PRIVACY || !DISCLAIMER) fail("cannot read PRIVACY_TEXT / DISCLAIMER_TEXT from Goten's src/config.ts")
// plan 43 (owner 2026-11-24): the notices live on /policy/ only, word for word, and every footer leads there
{
  const policy = plain(/<main[\s\S]*<\/main>/.exec(html[POLICY])?.[0] ?? '')
  for (const [what, words] of [
    ['DISCLAIMER_TEXT', DISCLAIMER],
    ['PRIVACY_TEXT', PRIVACY],
    ['the platform statement', 'Not affiliated with any platform.'],
    ['the software statement (N28)', 'Vegeta is open-source software, not a regulated service. It does not hold money or give advice.'],
    // plan 44 §5: where the Explore text goes, that it is kept nowhere here, and that the suggestions are not advice
    ['the Explore data statement', 'This site does not store or log it, and asks the gateway to use only providers that do not train on it.'],
    [
      'the Explore count statement',
      'the site counts requests by a keyed hash of your IP address; the count for the minute is deleted after a minute and the count for the day after 26 hours.',
    ],
    ['the Explore advice statement', 'The suggestions are links to pages of this site, not advice about your situation.'],
  ])
    if (!policy.includes(words ?? '\0')) fail(`${POLICY}: ${what} is not there word for word`)
  if (!/<a href="\/policy\/">Policy<\/a>/.test([...footers][0] ?? '')) fail('the footer must link /policy/')
  if (!/<a href="\/explore\/">Explore<\/a>/.test([...footers][0] ?? '')) fail('the footer must link /explore/ (plan 44)')
  // no page says its examples are fictional: /policy/ says it once (the docs pages and the demo package are the products' own
  // text). What a reader sees or a link preview shows counts: the page body, the title, the descriptions and image alt text;
  // text only for screen readers (sr-only) does not (plan 43 §2.3)
  for (const [url, h] of Object.entries(html)) {
    if (url === POLICY || DOCS.includes(url)) continue
    // the whole body (not only <main>), less any element whose classes include sr-only (none of them nests its own tag)
    const body = (/<body[\s\S]*<\/body>/.exec(h)?.[0] ?? '')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<(\w+)\b[^>]*\bclass="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g, ' ')
    const meta = [
      ...h.matchAll(
        /<title>([^<]*)<\/title>|<meta\s+(?:name|property)="(?:description|og:description|og:title|twitter:title|twitter:description)"\s+content="([^"]*)"|\salt="([^"]*)"/g,
      ),
    ]
      .map((m) => m.slice(1).join(' '))
      .join(' ')
    const seen = plain(body)
    if (/fictional/i.test(seen + ' ' + meta)) fail(`${url}: says "fictional" (plan 43: that is said once, on ${POLICY})`)
  }
}

// FAQ structure (handbook §4.5): every question has its own id with the page's prefix, a summary and its answer; numbers
// only from a short fixed list per page (counts and figures live in the trust sections, backed by release notes)
// quoted: { item id: product sentence } that item must carry word for word; its figures are allowed only there
function faqOf(url, prefix, numbers, count, oneParagraph = true, quoted = {}) {
  const faq = /<section class="faq"[\s\S]*?<\/section>/.exec(html[url])?.[0] ?? ''
  const answer = oneParagraph ? '<p>(?:(?!<\\/?p\\b)[\\s\\S])+<\\/p>' : '[\\s\\S]+?'
  const items = [
    ...faq.matchAll(new RegExp(`<details class="faq__item" id="(${prefix}-[a-z-]+)">\\s*<summary>[^<]+<\\/summary>\\s*${answer}\\s*<\\/details>`, 'g')),
  ]
  if (items.length < 1 || items.length !== (faq.match(/<details\b/g) ?? []).length)
    fail(`${url} FAQ: every <details> needs a ${prefix}-* id, a summary and one answer`)
  if (!/<a href="#faq">[^<]*FAQ<\/a>/.test(html[url]) && !(url === '/' && html[url].includes('<a href="/#faq">FAQ</a>'))) fail(`${url} FAQ: nav link missing`)
  if (items.length !== count) fail(`${url} FAQ: ${items.length} questions, the approved number is ${count}`)
  const oneLine = (h) => plain(h).replace(/\s+/g, ' ')
  let rest = faq
  for (const [id, q] of Object.entries(quoted)) {
    const item = new RegExp(`<details class="faq__item" id="${id}">[\\s\\S]*?<\\/details>`).exec(faq)?.[0] ?? ''
    if (!oneLine(item).includes(q)) fail(`${url} FAQ: ${id} must carry the product's sentence: ${q}`)
    rest = rest.replace(item, oneLine(item).split(q).join(' '))
  }
  for (const [n] of oneLine(rest).matchAll(/\d[\d,.]*\d|\d/g)) if (!numbers.includes(n)) fail(`${url} FAQ: number ${n} is not allowed`)
  return faq
}

// ---- /goten/ (the accepted Goten page, moved from /) ----
{
  const faq = faqOf('/goten/', 'faq', ['3', '10', '2.0', '103'], 16)
  const dataAnswer = (/<details class="faq__item" id="faq-data">[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(faq)?.[1] ?? '').replace(/\s+/g, ' ')
  if (!dataAnswer.includes(PRIVACY ?? '\0')) fail('/goten/ FAQ: the data answer (#faq-data) does not carry PRIVACY_TEXT word for word')
  // a quoted phrase must be, whole, an on-screen app label (a string literal or JSX text in the app's .tsx files, not tests,
  // comments removed) or a CSV header alias in src/lib/csv.ts
  const tsx = (d) => walk(d).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
  const appSrc = tsx(join(GOTEN, 'src'))
    .map((f) => stripComments(read(f)))
    .join('\n')
  const csvSrc = stripComments(read(join(GOTEN, 'src/lib/csv.ts')))
  for (const [, q] of faq.matchAll(/&ldquo;([^&]+)&rdquo;/g)) {
    const literal = new RegExp(`(['"\`])${esc(q)}\\1`)
    const jsxText = new RegExp(`>\\s*${esc(q)}\\s*<`)
    if (!literal.test(appSrc) && !jsxText.test(appSrc) && !literal.test(csvSrc))
      fail(`/goten/ FAQ quotes "${q}", which is neither an app label nor a CSV header alias`)
  }
  // trust figures (P9): each must be backed by the release notes
  const notes = read(join(GOTEN, 'docs/RELEASE_NOTES.md'))
  // the page names the release whose checks measured all three (v1.5.0, 2026-11-26); a later release may keep them only
  // while it says the calculations are unchanged (same rule as the overview's "measured on")
  const measuredGoten = /<p class="trust__note">Figures from the (v[\d.]+) release checks\.<\/p>/.exec(html['/goten/'])?.[1] ?? ''
  const gotenReleases = releasesOf(notes).map((r) => r.version)
  if (!gotenReleases.includes(measuredGoten)) fail(`/goten/: the trust note must name a release in Goten's notes ("Figures from the vX.Y.Z release checks.")`)
  for (const v of gotenReleases.slice(0, Math.max(0, gotenReleases.indexOf(measuredGoten))))
    if (!/\b[Cc]alculations\b(?:(?!\bchanged\b)[^.;])*\bunchanged\b/.test(releaseSection(notes, v.slice(1))))
      fail(`/goten/: Goten ${v} does not say the calculations are unchanged, so figures from ${measuredGoten} cannot stand for it`)
  const measuredNotes = releaseSection(notes, measuredGoten.slice(1))
  const figures = [
    ['3,000', /\b3,000 generated cases agreeing with it\b/],
    ['337 / 337', /\b337 of 337 mutants caught\b/],
    ['272 / 272', /\b272 of 272 due test-plan cases\b/],
  ]
  for (const [shown, backed] of figures) {
    if (!html['/goten/'].includes(`<dt>${shown}</dt>`)) fail(`/goten/ trust figure ${shown} not on the page as expected`)
    if (!backed.test(measuredNotes)) fail(`/goten/ trust figure ${shown} is not in the ${measuredGoten} section of Goten's docs/RELEASE_NOTES.md`)
  }
}

// ---- / (overview) ----
{
  const faq = faqOf('/', 'dfaq', ['2.0'], 6)
  const data = (/<details class="faq__item" id="dfaq-data">[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(faq)?.[1] ?? '').replace(/\s+/g, ' ')
  if (!data.includes(PRIVACY ?? '\0')) fail('/ FAQ: the data answer (#dfaq-data) does not carry PRIVACY_TEXT word for word')
  if (/&ldquo;/.test(html['/'])) fail('/: no quoted UI text on the overview (quotes belong on the module pages, where they are checked)')
  if (/<dt>[^<]*\d/.test(html['/'])) fail('/: no figures on the overview (figures live on the module pages, backed by release notes)')
  // N29: an old link (/#faq-import) is sent on to /goten/, so the overview must not have such ids, and /goten/ must
  const OLD = /^(faq-[a-z-]+|step-[1-3]|how|trust|built)$/
  for (const id of idsOf(html['/'])) if (OLD.test(id)) fail(`/: id ${id} is an old Goten anchor that site.js forwards to /goten/`)
  // the accepted Goten page's ids (main @ 90f035c): every old link must still find its target
  const LEGACY = ['how', 'trust', 'built', 'faq', 'step-1', 'step-2', 'step-3']
  for (const q of [
    'who',
    'not',
    'structure',
    'account',
    'data',
    'import',
    'currency',
    'export',
    'no-reference',
    'not-arrived',
    'oversubscribed',
    'withdraw',
    'fees',
    'carry',
    'right',
    'ready',
  ])
    LEGACY.push('faq-' + q)
  for (const id of LEGACY) if (!idsOf(html['/goten/']).includes(id)) fail(`/goten/: old anchor #${id} missing`)
  if (!read('site-src/site.js').includes(String.raw`/^#(faq-[a-z-]+|step-[1-3]|how|trust|built)$/`))
    fail('site-src/site.js: the old-anchor list differs from the check')
}

// ---- /trunks/ ----
{
  const page = html['/trunks/']
  const text = plain(page)
  // K3 (P9): every figure on the page is backed by Trunks release notes (CHANGELOG.md at trunks.ref)
  const allNotes = plain(trunksNotesRaw.replace(/\*\*/g, ''))
  const figures = Object.values(trunksTrust)
  const dts = [...page.matchAll(/<dt>([^<]*\d[^<]*)<\/dt>/g)].map((m) => m[1])
  if (dts.length !== figures.length || dts.some((d, i) => d !== figures[i])) fail(`/trunks/: trust figures differ from the measured v${trunksVersion} release`)
  const note = plain(/<p class="trust__note">([\s\S]*?)<\/p>/.exec(/<section class="trust"[\s\S]*?<\/section>/.exec(page)?.[0] ?? '')?.[1] ?? '')
  if (!note.includes(`v${trunksVersion} release checks`)) fail('/trunks/: trust note does not name the current release')
  if (trunksMeasuredVersion !== trunksVersion && !note.includes(`Measured on v${trunksMeasuredVersion}`))
    fail('/trunks/: trust note does not identify the measured release')
  for (const [n] of note.matchAll(/\d[\d,.]*\d|\d/g)) {
    const proof =
      n === trunksMeasuredVersion && trunksMeasuredVersion !== trunksVersion
        ? /measured on/
        : n === trunksVersion
          ? new RegExp(`^## v${esc(trunksVersion)}\\b`, 'm')
          : { 126: /held-out set of 126 emails/, 5.5: /Claude Opus 5\.5/ }[n]
    // the held-out set belongs to the measured release (the same as the current one unless the figures are carried forward)
    if (!proof?.test(n === '126' ? measuredInboxNotes : currentInboxNotes)) fail(`/trunks/ trust note: ${n} is not backed by the current Trunks release`)
  }
  // N15: the problem section quotes figures from an external report; they were checked against the report itself
  // (UK Finance, Annual Fraud Report 2026, p. 42: invoice & mandate scam, value £41.3m, 68 per cent on non-personal
  // accounts), so only those figures may appear there, and only with the source line
  const problem = plain(/<section class="built built--top" id="problem"[\s\S]*?<\/section>/.exec(page)?.[0] ?? '')
  for (const [n] of problem.matchAll(/£?\d+(?:[.,]\d+)*(?:m|bn|%)?/g))
    if (!['01', '02', '03', '04', '£41.3m', '68%', '2025', '2026'].includes(n))
      fail(`/trunks/ problem section: figure ${n} is not one checked against the report`)
  if (!problem.includes('Fraud figures: UK Finance, Annual Fraud Report 2026 (figures for 2025), invoice and mandate scams.'))
    fail('/trunks/ problem section: the source line for the fraud figures is missing')
  // K5: the release notes' test-scope sentences for Microsoft 365 and Gmail, on the page. The first is punctuated as
  // mailboxes.md:21-23 means it (the whole Microsoft 365 connector, and Gmail's Pub/Sub, were tested only against
  // simulated services; Microsoft 365 has no push), because the CHANGELOG wording reads as if Microsoft 365 had push
  // notifications (audit 2026-11-20 A4)
  const testScope = [
    [
      'Microsoft 365 and Gmail push notifications (Pub/Sub) were tested only against simulated services.',
      'Microsoft 365, and Gmail push notifications (Pub/Sub), were tested only against simulated services.',
    ],
    ['Gmail polling was tested on one personal Gmail account.', 'Gmail polling was tested on one personal Gmail account.'],
  ]
  // each sentence is said in the Mailboxes card and in the mailbox FAQ answer, each place on its own; the ambiguous
  // original never appears anywhere on the page (audit 2026-11-20 R1)
  const oneLine = (h) => plain(h).replace(/\s+/g, ' ')
  const mailboxPlaces = {
    'the Mailboxes card': oneLine(/<li\b[^>]*>\s*<span class="built__n">\d+<\/span>\s*<h3>Mailboxes<\/h3>[\s\S]*?<\/li>/.exec(page)?.[0] ?? ''),
    'the mailbox FAQ answer': oneLine(/<details class="faq__item" id="ifaq-mailbox">[\s\S]*?<\/details>/.exec(page)?.[0] ?? ''),
  }
  const pageLine = oneLine(page)
  for (const [note, said] of testScope) {
    if (!allNotes.includes(note)) fail(`Trunks CHANGELOG.md no longer says: ${note}`)
    for (const [where, t] of Object.entries(mailboxPlaces)) if (!t.includes(said)) fail(`/trunks/ ${where} must carry: ${said}`)
    if (note !== said && pageLine.includes(note)) fail(`/trunks/ uses the ambiguous wording: ${note}`)
  }
  // and every sentence on the page about how a mailbox kind was tested is one of them
  for (const t of text.split(/(?<=\.)\s+/))
    if (/\btested\b/.test(t) && /Gmail|Microsoft 365|Pub\/Sub|IMAP/.test(t) && !allNotes.includes(t.trim()) && !testScope.some(([, said]) => said === t.trim()))
      fail(`/trunks/: "${t.trim()}" is not the release notes' wording`)
  // K4: a quoted phrase is, whole, Trunks on-screen text: a string literal or a JSX text run in src/web (not tests, comments
  // removed), or a value shown in the demo snapshot. "Whole" means the entire literal or text run, or one or more complete
  // sentences or lines of a snapshot value (a reply's body is quoted sentence by sentence), never a fragment of code.
  const trunksSrc = walk(join(TRUNKS, 'src/web'))
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
    .map((f) => stripComments(read(f)))
    .join('\n')
  const norm = (t) => t.replace(/\s+/g, ' ').trim()
  const literals = new Set([...trunksSrc.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)+)\1/g)].map((m) => norm(m[2].replace(/\\(.)/g, '$1'))))
  for (const [, run] of trunksSrc.matchAll(/[>}]([^<>{}]+)(?=[<{])/g)) literals.add(norm(run.replace(/^\s*[—–-]\s*/, '')))
  const values = []
  const collect = (v) => (typeof v === 'string' ? values.push(v) : v && typeof v === 'object' && Object.values(v).forEach(collect))
  collect(snapshot ?? {})
  // q is one or more whole sentences or lines of v: it starts at the start or after a line break or a sentence end, and
  // ends at the end, a line break or a space
  const wholeSentences = (v, q) => {
    for (let i = v.indexOf(q); i >= 0; i = v.indexOf(q, i + 1)) {
      const before = v.slice(0, i)
      const after = v.slice(i + q.length)
      const ends = after === '' || after.startsWith('\n') || (/[.!?]$/.test(q) && /^\s/.test(after))
      if ((before === '' || /(\n|[.!?:]\s)$/.test(before)) && ends) return true
    }
    return false
  }
  for (const [, raw] of page.matchAll(/&ldquo;([\s\S]+?)&rdquo;/g)) {
    const q = norm(raw.replace(/&rsquo;/g, "'"))
    if (!literals.has(q) && !values.some((v) => wholeSentences(v.replace(/[ \t]+/g, ' '), q)))
      fail(`/trunks/ quotes "${q}", which is not whole Trunks UI text or demo data`)
  }
  // the hero panels repeat the review screen's words (the risk reasons, the checklist) and the demo's reply and email:
  // each must be whole on-screen text or a whole demo sentence; the email excerpt (ending in an ellipsis) a part of the
  // demo email (plan 14 R4)
  const e0225 = snapshot?.details?.E0225 ?? {}
  const byClass = (h, tag, cls) =>
    [...h.matchAll(new RegExp(`<${tag}\\b[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g'))].map((m) => m[1])
  const textOf = (frag) => norm(plain(frag).replace(/&hellip;|…/g, ''))
  const HERO = {
    '/trunks/': { reasons: 3, checks: 2, reply: 1, excerpt: 1 },
  }
  for (const [url, want] of Object.entries(HERO)) {
    const scene = /<figure\b[^>]*\bclass="[^"]*\bscene\b[^"]*"[^>]*>[\s\S]*?<\/figure>/.exec(html[url])?.[0] ?? ''
    const items = (cls) => byClass(scene, 'ul', cls).flatMap((ul) => [...ul.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1])))
    const got = {
      reasons: items('reasons'),
      checks: items('checks'),
      reply: byClass(scene, 'p', 'panel__text').map(textOf),
      excerpt: byClass(scene, 'p', 'panel__quote').map(textOf),
    }
    for (const k of Object.keys(want)) if (got[k].length !== want[k]) fail(`${url} hero: ${got[k].length} ${k}, expected ${want[k]}`)
    for (const q of [...got.reasons, ...got.checks, ...got.reply])
      if (!literals.has(q) && !values.some((v) => wholeSentences(v.replace(/[ \t]+/g, ' '), q)))
        fail(`${url} hero: "${q}" is not whole Trunks UI text or demo data`)
    for (const q of got.excerpt) if (!norm(e0225.text ?? '').includes(q)) fail(`${url} hero: the email excerpt is not part of the demo email E0225`)
  }
  // every use case links to its sample in the demo
  // a use case is reached by a link, so it has no entrance animation (handbook §10 item 12)
  if (/<li class="case"[^>]*data-reveal/.test(page)) fail('/trunks/: a use case has an entrance animation; links land on them')
  const caseItems = [...page.matchAll(/<li class="case" id="(case-[a-z]+)"[^>]*>([\s\S]*?)<\/li>/g)]
  if (caseItems.length !== 6) fail(`/trunks/: expected six use cases, found ${caseItems.length}`)
  for (const [, id, body] of caseItems) if (!/href="\/trunks\/demo\/#case=E\d{4}"/.test(body)) fail(`/trunks/ use case ${id} has no demo link`)
  // the 18 kinds of email (plan 38 §8): the default configuration, the user docs' table and the page agree.
  // config/default/cases.yaml gives each kind's risk floor in order; docs/en/use/reading-a-case.md names them as the UI does
  const cfgKinds = [...read(join(TRUNKS, 'config/default/cases.yaml')).matchAll(/\{ id: ([a-z_]+), risk_floor: ([a-z]+), queue: ([a-z_]+) \}/g)].map((m) => ({
    id: m[1],
    risk: m[2],
  }))
  const docKinds = [...read(join(TRUNKS, 'docs/en/use/reading-a-case.md')).matchAll(/^\| ([A-Z][^|]*?) \| (High|Medium|Low) \| [^|]+ \|$/gm)].map((m) => ({
    name: m[1],
    risk: m[2].toLowerCase(),
  }))
  if (cfgKinds.length < 1 || docKinds.map((k) => k.risk).join('|') !== cfgKinds.map((k) => k.risk).join('|'))
    fail('/trunks/: the email types in docs/en/use/reading-a-case.md differ from config/default/cases.yaml (count or starting risk)')
  const kindsBlock = /<div class="kinds" id="case-categories">([\s\S]*?)\n {8}<\/div>\n/.exec(page)?.[1] ?? ''
  if (!kindsBlock) fail('/trunks/: no kinds of email block (#case-categories)')
  const kindsTitle = /<h3>(\d+) kinds of email<\/h3>/.exec(kindsBlock)?.[1]
  if (Number(kindsTitle) !== cfgKinds.length) fail(`/trunks/: the title says ${kindsTitle} kinds of email; the configuration has ${cfgKinds.length}`)
  for (const tier of ['high', 'medium', 'low']) {
    const group = new RegExp(`<div class="kinds__group kinds__group--${tier}">([\\s\\S]*?)</ul>`).exec(kindsBlock)?.[1]
    const want = docKinds.filter((k) => k.risk === tier).map((k) => k.name)
    // a risk with no kinds has no group (no "0 Low" heading)
    if (!want.length) {
      if (group !== undefined) fail(`/trunks/: the ${tier} group is shown, but no kind of email starts at ${tier} risk`)
      continue
    }
    const got = [...(group ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => plain(m[1]).trim())
    const count = /<h4 class="kinds__risk"><span class="kinds__n">(\d+)<\/span> <span class="kinds__tier">[A-Za-z]+<\/span><\/h4>/.exec(group ?? '')?.[1]
    if (got.join('|') !== want.join('|')) fail(`/trunks/: the ${tier} kinds of email differ from the Trunks docs (${got.join(', ')} vs ${want.join(', ')})`)
    if (Number(count) !== want.length) fail(`/trunks/: the ${tier} kinds of email are counted as ${count}, not ${want.length}`)
  }
  // nothing else in the block: no other group, no extra names
  const kindsShown = [...kindsBlock.matchAll(/<li\b/g)].length
  if (kindsShown !== docKinds.length) fail(`/trunks/: the kinds of email block lists ${kindsShown} names; the Trunks docs have ${docKinds.length}`)
  if (/kinds__group--(?!high"|medium"|low")/.test(kindsBlock)) fail('/trunks/: the kinds of email block has a group other than high, medium and low')
  // FAQ: only the current release, Apache-2.0, MT103, pacs.008 and Microsoft 365 are numbers.
  faqOf('/trunks/', 'ifaq', [trunksVersion, trunksMeasuredVersion, '2.0', '103', '008', '365'], 14)
}

// ---- /bulma/ (plan 39) ----
{
  const page = html['/bulma/']
  const norm = (t) => t.replace(/\s+/g, ' ').trim()
  // Bulma's on-screen words: every string literal and JSX text run in src/web and src/lib (not tests, comments removed), as
  // for Trunks K4; src/lib too, because the status words the screens show live there (participation.ts)
  const src = [...walk(join(BULMA, 'src/web')), ...walk(join(BULMA, 'src/lib'))]
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
    .map((f) => stripComments(read(f)))
    .join('\n')
  const ui = new Set([...src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)+)\1/g)].map((m) => norm(m[2].replace(/\\(.)/g, '$1'))))
  for (const [, run] of src.matchAll(/[>}]([^<>{}]+)(?=[<{])/g)) ui.add(norm(run))
  // R5: Bulma's fixed demo data, the source of every name, amount and date in the pictures: site-src/bulma-demo.json, one
  // entry per value with where it comes from (plan 39 R5)
  // and values the site proposed count only once Bulma has checked them in its sandbox ("checked" no longer "pending")
  const demo = JSON.parse(read('site-src/bulma-demo.json'))
  if (!Array.isArray(demo.values)) fail('site-src/bulma-demo.json: no list of values')
  const demoValues = (demo.values ?? []).map((v) => {
    if (typeof v.value !== 'string' || !Object.hasOwn(demo.sources ?? {}, v.source))
      fail(`site-src/bulma-demo.json: every value needs a source named under "sources" (${JSON.stringify(v)})`)
    if (v.source === 'site-proposal' && /^pending/.test(demo.checked ?? 'pending'))
      fail(`site-src/bulma-demo.json: ${v.value} is the site's proposal and Bulma has not checked it yet`)
    return v.value
  })
  // the site's own words in the pictures: the panels' numbered labels and an empty days cell
  const OWN_WORDS = new Set(['1 · The investor', '2 · The lead', '3 · The deal', '—'])
  const leaves = (frag) =>
    [...frag.replace(/<small>([\s\S]*?)<\/small>/g, '</x><x>$1</x><x>').matchAll(/>([^<>]+)</g)]
      .map((m) => norm(plain(m[1])))
      .filter(Boolean)
      .flatMap((t) => (OWN_WORDS.has(t) ? [] : t.split(' · ')))
  const scene = /<figure class="scene[^"]*"[\s\S]*?<figcaption/.exec(page)?.[0] ?? ''
  if (!scene) fail('/bulma/: no hero picture')
  const pictures = [...page.matchAll(illustrationPattern)]
  if (pictures.map((m) => m[1]).join(',') !== 'setup,invite,pay,follow') fail('/bulma/: expected the setup, invite, pay and follow step pictures, in order')
  const unbacked = new Set()
  for (const frag of [scene, ...pictures.map((m) => m[0].replace(/aria-label="[^"]*"/, ''))])
    for (const t of leaves(frag)) if (!ui.has(t) && !demoValues.includes(t)) unbacked.add(t)
  if (unbacked.size)
    fail(`/bulma/: ${unbacked.size} words in the pictures are neither Bulma on-screen text nor its demo data (R5): ${[...unbacked].join(' | ')}`)
  // each demo value sits where it belongs: with its label or row, as many times as listed, and nowhere else (audit 2026-11-20 K3)
  const pictureText = [scene, ...pictures.map((m) => m[0])]
    .map((f) => plain(f.replace(/aria-label="[^"]*"/g, '').replace(/<[^>]+>/g, ' ')))
    .join(' ')
    .replace(/\s+/g, ' ')
  const count = (hay, needle) => hay.split(needle).length - 1
  for (const v of demo.values ?? []) {
    if (!Array.isArray(v.shown)) continue
    for (const place of new Set(v.shown))
      if (count(pictureText, place) !== v.shown.filter((p) => p === place).length)
        fail(`/bulma/: the pictures must show "${place}" ${v.shown.filter((p) => p === place).length} time(s)`)
    const word = new RegExp(`(?<![\\w.,£-])${esc(v.value)}(?![\\w.,-]*\\d)`, 'g')
    // single digits (days) are held by their row; panel numbers such as "1 · The investor" use them too
    if (v.value.length > 2 && (pictureText.match(word) ?? []).length !== v.shown.length)
      fail(`/bulma/: ${v.value} appears in the pictures outside its places (${v.shown.join('; ')})`)
  }
  // the pictures' descriptions for screen readers name no figure the picture does not show
  const shown = [scene, ...pictures.map((m) => m[0])].map((f) => plain(f.replace(/aria-label="[^"]*"/g, ''))).join(' ')
  const described = [...page.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]).join(' ') + plain(/<figcaption[\s\S]*?<\/figcaption>/.exec(page)?.[0] ?? '')
  for (const [n] of described.matchAll(/£?\d+(?:[.,]\d+)*/g))
    if (!shown.includes(n)) fail(`/bulma/: a picture's description names ${n}, which the picture does not show`)
  // why trust it: every figure is in the release's notes, and so is the sentence under a figure that is a word
  const trust = /<section class="trust" id="trust"[\s\S]*?<\/section>/.exec(page)?.[0] ?? ''
  const facts = [...trust.matchAll(/<dt>([^<]+)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map((m) => [norm(plain(m[1])), norm(plain(m[2]))])
  const notesText = norm(plain(bulmaNotes.replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')))
  if (facts.length < 3 || facts.length > 4) fail(`/bulma/: why trust it has ${facts.length} figures, expected 3 or 4`)
  for (const [figure, under] of facts)
    // plan 43: a sentence may leave out the notes' "with fictional data" (said once on /policy/), and nothing else
    if (/\d/.test(figure) ? !bulmaBacked(figure, under) : ![notesText, notesText.replace(/ with fictional data/g, '')].some((t) => t.includes(under)))
      fail(`/bulma/ trust figure ${figure}: no line of the v${bulmaVersion} section of Bulma's release notes has it with what it measures`)
  if (!trust.includes(`<p class="trust__note">Figures from the v${bulmaVersion} release checks.</p>`))
    fail(`/bulma/: the trust note must name the v${bulmaVersion} release checks`)
  // Limits: each sentence is Bulma's own, from its README or English docs at the pin
  // whole sentences only, so a fragment that drops a negation ("holds shares or runs a wallet.") does not pass
  const own = new Set(
    [join(BULMA, 'README.md'), ...walk(join(BULMA, 'docs/en')).filter((f) => f.endsWith('.md'))]
      .map(read)
      .join('\n')
      .replace(/\*\*|`/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .split('\n')
      .map((l) => norm(plain(l.replace(/^\s*(?:[-*>#|]+|\d+\.)\s*/, '').replace(/\s*\|\s*/g, ' | '))))
      .flatMap((l) => l.split(/(?<=[.!?])\s+|\s\|\s/))
      .map(norm),
  )
  const limits = /<dl class="risks__list">[\s\S]*?<\/dl>/.exec(page)?.[0] ?? ''
  const rows = [...limits.matchAll(/<dd>([\s\S]*?)<\/dd>/g)].map((m) => norm(plain(m[1])))
  if (rows.length < 5 || rows.length > 6) fail(`/bulma/: Limits has ${rows.length} rows, expected 5 or 6`)
  for (const row of rows) for (const t of row.split(/(?<=\.)\s+/)) if (!own.has(t)) fail(`/bulma/ Limits: "${t}" is not a sentence of Bulma's README or docs`)
  // FAQ: only the current release and Apache-2.0 are numbers
  // the entity answer quotes Bulma's investor guide (docs/en/use/investor-guide.md, section 4); its 25% is allowed only there (audit R2)
  const entityPeople =
    'A company or trust also lists its people: directors, anyone with a share over 25% or in control, and whoever acts for it. Each beneficial owner confirms their details through their own link.'
  if (!read(join(BULMA, 'docs/en/use/investor-guide.md')).replace(/\s+/g, ' ').includes(entityPeople))
    fail(`Bulma's investor guide no longer says: ${entityPeople}`)
  faqOf('/bulma/', 'bfaq', [bulmaVersion, '2.0'], 12, true, { 'bfaq-entity': entityPeople })
  // every other figure on the page is in this inventory
  // numbering is left out by element (step eyebrows and the server list), not allowed everywhere; a figure such as
  // "301 / 301" is allowed number by number
  const allowed = new Set(['2.0', bulmaVersion, ...facts.flatMap(([f]) => [f, ...(f.match(/\d+(?:[.,]\d+)*/g) ?? [])])])
  const rest = plain(
    page
      .replace(/<p class="eyebrow">Step [1-4] · /g, '<p class="eyebrow">')
      .replace(/<span class="built__n">0[1-4]<\/span>/g, ' ')
      .replace(illustrationPattern, ' ')
      .replace(/<figure class="scene[\s\S]*?<\/figure>/, ' ')
      .replace(/<section class="faq"[\s\S]*?<\/section>/, ' ')
      .replace(/<head>[\s\S]*?<\/head>/, ' '),
  )
  for (const [n] of rest.matchAll(/£?\d+(?:[.,]\d+)*(?:m|bn|%)?/g)) if (!allowed.has(n)) fail(`/bulma/: figure ${n} is not in the inventory of backed figures`)
  for (const [m] of plain(page).matchAll(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|fifty|hundred)\s+(years?|months?|weeks?|days?|hours?|minutes?|per ?cent|times)\b/gi,
  ))
    fail(`/bulma/: "${m}" is a figure written out; figures need a backed number`)
}

// ---- K3 for the whole text: every figure on / and /trunks/ is in an inventory with its source ----
// (quoted UI text is checked by K4; spelled-out amounts of time or shares are not allowed at all)
{
  const figures = (h) =>
    plain(
      h
        .replace(illustrationPattern, ' ')
        .replace(/&ldquo;[\s\S]*?&rdquo;/g, ' ')
        .replace(/&#\d+;/g, ' '),
    ).matchAll(/£?\d+(?:[.,]\d+)*(?:m|bn|%)?/g)
  const shownText = JSON.stringify(snapshot ?? {})
  const numbering = ['01', '02', '03', '04', '05', '06', '1', '2', '3', '4']
  const names = {
    365: 'Microsoft 365',
    103: 'MT103',
    '008': 'pacs.008',
    '2.0': 'Apache-2.0',
    [trunksVersion]: 'the current release',
    [trunksMeasuredVersion]: 'the measured release',
  }
  // Each trust value is already parsed and validated against its current release metric above.
  const releaseFigureNumbers = new Set(Object.values(trunksTrust).flatMap((value) => value.split(' / ')))
  const INBOX_FIGURES = { 126: /held-out set of 126 emails/, 5.5: /Claude Opus 5\.5/ }
  // the kinds of email block's counts are checked against the configuration above, so its numbers are left out here
  for (const [n] of figures(html['/trunks/'].replace(/<div class="kinds" id="case-categories">[\s\S]*?\n {8}<\/div>\n/, ' '))) {
    if (numbering.includes(n) || names[n]) continue
    if (['£41.3m', '68%', '2025', '2026'].includes(n)) continue // the problem section's report figures, checked above
    if (releaseFigureNumbers.has(n)) continue
    if (INBOX_FIGURES[n]) {
      if (!INBOX_FIGURES[n].test(measuredInboxNotes)) fail(`/trunks/: figure ${n} is no longer in Trunks CHANGELOG.md`)
      continue
    }
    if (n === '4893' && shownText.includes('"ending 4893"')) continue // demo sample E0225, as shown
    fail(`/trunks/: figure ${n} is not in the inventory of backed figures`)
  }
  const gotenNotes = read(join(GOTEN, 'docs/RELEASE_NOTES.md'))
  // Bulma's column shows a figure from its page's trust section, backed by its notes there (the /bulma/ checks)
  const bulmaFacts = [
    ...(/<section class="trust" id="trust"[\s\S]*?<\/section>/.exec(html['/bulma/'])?.[0] ?? '').matchAll(/<dt>([^<]*\d[^<]*)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g),
  ].map((m) => [m[1], plain(m[2])])
  const bulmaFigures = bulmaFacts.map(([f]) => f)
  const MODULE_PROOF = {
    bulma: {
      figure: bulmaFigures[0],
      release: bulmaVersion,
      latest: bulmaLatest ?? { version: `v${bulmaVersion}`, date: 'unknown' },
    },
    // Goten's figure is restated by v1.5.0 (its calculations changed, so nothing older can stand for it);
    // if a later release only says the calculations are unchanged, keep release here and the column says "measured on"
    goten: {
      figure: '3,000',
      release: '1.5.0',
      latest: releasesOf(gotenNotes)[0],
    },
    trunks: {
      figure: trunksTrust.high,
      release: trunksMeasuredVersion,
      latest: releasesOf(trunksNotesRaw)[0],
    },
  }
  // "measured on" an older release holds only while every later release says its calculations are unchanged
  for (const r of releasesOf(gotenNotes)) {
    if (r.version === `v${MODULE_PROOF.goten.release}`) break
    if (!/\b[Cc]alculations\b(?:(?!\bchanged\b)[^.;])*\bunchanged\b/.test(releaseSection(gotenNotes, r.version.slice(1))))
      fail(
        `Goten ${r.version}: its notes do not say the calculations are unchanged, so the figure measured on v${MODULE_PROOF.goten.release} cannot be quoted for it`,
      )
  }
  if (MODULE_PROOF.trunks.latest.version !== `v${trunksVersion}`) fail('Trunks: the newest release in CHANGELOG.md is not the package version')
  const modules = [...html['/'].matchAll(/<article class="module module--([a-z]+)"[^>]*>([\s\S]*?)<\/article>/g)]
  if (modules.map((m) => m[1]).join(',') !== 'bulma,goten,trunks') fail('/: expected Bulma, Goten and Trunks module columns, in that order')
  // plan 41: the overview shows each module, not its detail: its name leading to its page, its kind, who it is for, the release
  // (plan 36 C2: the newest in its notes, with its date, leading to the changelog), where it runs, and its code. The figures
  // and what each module does live on the module pages, where they are checked against the release notes
  const CARD = {
    bulma: ['SPV Workspace', 'For syndicate leads and invited investors.', 'Runs on your server', 'https://github.com/vegeta-labs/bulma'],
    goten: ['Deal Calculations', 'For SPV and syndicate operations teams.', 'Runs in your browser', 'https://github.com/vegeta-labs/goten'],
    trunks: ['Operations Inbox', 'For SPV and syndicate operations teams.', 'Runs on your server', 'https://github.com/vegeta-labs/trunks'],
  }
  for (const [, mod, body] of modules) {
    const want = MODULE_PROOF[mod]
    const [type, who, runs, code] = CARD[mod] ?? []
    const name = mod[0].toUpperCase() + mod.slice(1)
    const card = [
      `<h3 class="module__name"><a href="/${mod}/">${name}</a></h3>`,
      `<p class="module__type">${type}</p>`,
      `<p class="module__version"><a href="/changelog/">${want?.latest.version} · ${want?.latest.date}</a></p>`,
      `<p class="module__lede">${who}</p>`,
      `<p class="module__runs">${runs}</p>`,
      // plan 42 D2: a module drawn on /demos/ also leads to its demo
      `<p class="fact__links"><a href="/${mod}/">How it works <span class="arrow" aria-hidden="true">→</span></a>${DEMO_MODULES.includes(mod) ? `<a href="/demos/${mod}/">See the demo <span class="arrow" aria-hidden="true">→</span></a>` : ''}<a href="${code}">Code <span class="arrow" aria-hidden="true">→</span></a></p>`,
    ].join('')
    if (flatTags(body).trim() !== flatTags(card))
      fail(
        `/: the ${mod} column must be its name, kind, audience, ${want?.latest.version} · ${want?.latest.date} with where it runs, and its code, nothing else (plan 41)`,
      )
  }
  // plan 39: Bulma is released, so nothing on / says it is in development
  if (/modnext|In development|Not released yet/.test(html['/'])) fail('/: a released module is not shown as in development')
  // plan 41 (owner 2026-11-21): Where it fits is one bar per module across the four stages, each stage named for screen readers
  // (the tag is shown on phones). The bars must match what each module has released; Bulma's closing is its one upcoming
  // stage, a dashed bar that says Upcoming and nothing more (D5). Change a row here only when that module's release notes do
  const FX_STAGES = ['Raise', 'Pay', 'Close', 'Exit']
  const FX_BARS = [
    'bulma||Raise:Deal set-up, invitations, commitments, signing|Pay:Payment instructions, money received',
    'bulma|soon|Close:Closing<i>Upcoming</i>',
    'goten||Pay:Payment reconciliation|Close:Closing allocation|Exit:Exit distribution',
    'trunks||Raise:KYC documents, signing invitations|Pay:Payment queries, proofs of payment|Close:Withdrawals, closing confirmations|Exit:Distribution questions, tax certificates',
  ]
  const fits = /<section class="fx" id="fits"[\s\S]*?<\/section>/.exec(html['/'])?.[0] ?? ''
  if (!fits) fail('/: Where it fits is missing (plan 41)')
  if (/<small\b/.test(fits)) fail('/: a Where it fits bar carries a note; bars name what each module does, nothing more (plan 41)')
  if (
    FX_STAGES.map((n, i) => `<p class="fx__head" aria-hidden="true"><i>0${i + 1}</i>${n}</p>`).join() !==
    [...fits.matchAll(/<p class="fx__head"[^>]*>[\s\S]*?<\/p>/g)].map((m) => flatTags(m[0])).join()
  )
    fail('/: Where it fits heads its columns Raise, Pay, Close, Exit (plan 41)')
  const bars = [...fits.matchAll(/<p class="fx__bar fx__bar--(\w+)( fx__bar--soon)? fx__span--(\d)-(\d)">([\s\S]*?)<\/p>/g)]
  const barText = bars.map(([, mod, soon, , , body]) => {
    const flat = flatTags(body).trim()
    const cells = [...flat.matchAll(/<span><b class="fx__tag sr-only">(\w+)<\/b>(.*?)<\/span>/g)]
    if (flat !== cells.map((c) => c[0]).join('')) fail(`/: a ${mod} bar of Where it fits holds something other than its stages`)
    return [mod, soon ? 'soon' : '', ...cells.map(([, stage, text]) => `${stage}:${text.trim()}`)].join('|')
  })
  if (barText.join('\n') !== FX_BARS.join('\n')) fail('/: the bars of Where it fits are not the released ones (plan 41)')
  for (const [, mod, , from, to, body] of bars) {
    const stages = [...body.matchAll(/fx__tag sr-only">(\w+)</g)].map((m) => FX_STAGES.indexOf(m[1]))
    if (+from !== stages[0] + 1 || +to !== stages.at(-1) + 2 || stages.some((n, i) => n !== stages[0] + i))
      fail(`/: a ${mod} bar of Where it fits does not span the stages it names (plan 41)`)
  }
  if (/\d/.test(plain(fits.replace(/<p class="fx__head"[\s\S]*?<\/p>/g, '')))) fail('/: Where it fits shows no figures besides its stage numbers')
  // each module's name comes before its bars, in the order of the bars, and nothing else is styled as a bar
  const fxNames = { bulma: 'Bulma', goten: 'Goten', trunks: 'Trunks' }
  const fxOrder = [...fits.matchAll(/<p class="fx__name fx__name--(\w+)">([^<]*)<\/p>|class="fx__bar fx__bar--(\w+)/g)].map((m) =>
    m[1] ? `${m[1]}=${m[2]}` : m[3],
  )
  const wantOrder = FX_BARS.map((b) => b.split('|')[0]).flatMap((mod, i, all) => (all[i - 1] === mod ? [mod] : [`${mod}=${fxNames[mod]}`, mod]))
  if (fxOrder.join() !== wantOrder.join() || (fits.match(/class="[^"]*\bfx__bar\b(?!-)/g) ?? []).length !== bars.length)
    fail('/: Where it fits names each module before its bars, Bulma, Goten, Trunks (plan 41)')
  // the reel button's running time is checked against the film itself (plan 32)
  const withoutModules = modules.reduce((h, m) => h.replace(m[0], ''), html['/']).replace(/<span class="reel__t">\d+:\d\d<\/span>/, '')
  for (const [n] of figures(withoutModules)) {
    if (numbering.includes(n) || names[n]) continue
    fail(`/: figure ${n} is not in the inventory of backed figures`)
  }
  const stamp = (r) => [r.version.slice(1), ...r.date.split('-')]
  const OWN = {
    bulma: [MODULE_PROOF.bulma.figure, bulmaVersion, ...stamp(MODULE_PROOF.bulma.latest)],
    goten: ['3,000', MODULE_PROOF.goten.release, ...stamp(MODULE_PROOF.goten.latest)],
    trunks: [...trunksTrust.high.split(' / '), trunksVersion, trunksMeasuredVersion, ...stamp(MODULE_PROOF.trunks.latest)],
  }
  for (const [, mod, body] of modules)
    for (const [n] of figures(body))
      if (!numbering.includes(n) && !(OWN[mod] ?? []).includes(n)) fail(`/: figure ${n} in the ${mod} column is not that module's figure`)
  for (const url of ['/', '/trunks/'])
    for (const [m] of plain(html[url]).matchAll(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|fifty|hundred)\s+(years?|months?|weeks?|days?|hours?|minutes?|per ?cent|times)\b/gi,
    ))
      fail(`${url}: "${m}" is a figure written out; figures need a backed number`)
}

// ---- K7, K8: /trunks/demo/ and /bulma/demo/ are exactly their locked packages ----
// A Bulma pack built from a development commit (bulma-demo.lock "dev": true, scripts/bulma-demo.mjs) is accepted here so the
// Demos page can be built against it; the public snapshot refuses it
const checkPack = (mod, DEMO) => {
  const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
  const lock = JSON.parse(read(`${mod}-demo.lock`))
  const ref = read(`${mod}.ref`).trim()
  if (lock.commit !== ref && !lock.dev) fail(`${mod}-demo.lock is for ${lock.commit}, ${mod}.ref is ${ref}`)
  const files = walk(DEMO)
    .map((f) => relative(DEMO, f))
    .sort()
  const want = [...Object.keys(lock.files), 'MANIFEST.sha256'].sort()
  for (const e of readdirSync(join(SITE, mod))) if (e.startsWith('.')) fail(`site/${mod}/${e}: a hidden file or directory would be published`)
  if (files.join('|') !== want.join('|')) fail(`/${mod}/demo/: files differ from ${mod}-demo.lock (${files.length} vs ${want.length})`)
  for (const [f, h] of Object.entries(lock.files))
    if (existsSync(join(DEMO, f)) && sha(join(DEMO, f)) !== h) fail(`/${mod}/demo/${f} differs from ${mod}-demo.lock`)
  if (existsSync(join(DEMO, 'MANIFEST.sha256')) && sha(join(DEMO, 'MANIFEST.sha256')) !== lock.manifest_sha256)
    fail(`/${mod}/demo/MANIFEST.sha256 differs from ${mod}-demo.lock`)
  const info = JSON.parse(read(join(DEMO, 'snapshot-info.json')))
  if ((info.commit !== ref && !lock.dev) || info.commit !== lock.commit || info.version !== lock.version)
    fail(`/${mod}/demo/snapshot-info.json does not match ${mod}.ref and the lock`)
  const index = read(join(DEMO, 'index.html'))
  if (!/<meta name="robots" content="noindex"/.test(index)) fail(`/${mod}/demo/: index.html has no noindex`)
  for (const [, attrs, body] of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))
    if (body.trim() || !/\bsrc="\.\/[^"]+"/.test(attrs)) fail(`/${mod}/demo/: a script that is inline or not from the demo directory`)
  if (/<style\b|\sstyle\s*=|\son[a-z]+\s*=/i.test(index)) fail(`/${mod}/demo/: inline style or event handler in index.html`)
  const snap = read(join(DEMO, 'data/snapshot.js'))
  for (const [email] of snap.matchAll(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g))
    if (!/\.(example|invalid)$/.test(email)) fail(`/${mod}/demo/ snapshot: e-mail address ${email} is not .example or .invalid (reserved names)`)
  for (const [re, what] of [
    [/Bearer\s+[\w-]/, 'a bearer token'],
    [/sk-ant-|-----BEGIN [A-Z ]*PRIVATE KEY/, 'a key'],
    [/"csrf":"(?!demo-csrf-\d+")[^"]/, 'a CSRF token'], // Bulma's pack carries placeholders demo-csrf-N
    [/"(password|passwordHash|secret|token)":"[^"]/i, 'a credential'],
    ...PRIVATE_TERMS,
  ])
    if (re.test(snap)) fail(`/${mod}/demo/ snapshot contains ${what}`)
}
checkPack('trunks', DEMO)
if (existsSync('bulma-demo.lock')) checkPack('bulma', join(SITE, 'bulma/demo'))
else if (existsSync(join(SITE, 'bulma/demo'))) fail('site/bulma/demo/ exists without bulma-demo.lock (install it with scripts/bulma-demo.mjs)')

// the served script is the current build, and small
const dir = mkdtempSync(join(tmpdir(), 'site-check-'))
try {
  execFileSync('npx', ['--no-install', 'rolldown', 'site-src/site.js', '-f', 'iife', '-m', '-o', join(dir, 'site.js')], { stdio: 'pipe' })
  if (read(join(dir, 'site.js')) !== read(join(SITE, 'site.js'))) fail('site/site.js is not the current build of site-src/site.js (run npm run site:build)')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
const gz = gzipSync(readFileSync(join(SITE, 'site.js'))).length
// 6 KB until 2026-11-27; plan 44 adds the articles' way back (owner: return to where you came from), so 6.25 KB
if (gz > 6400) fail(`site/site.js is ${gz} bytes gzip, over 6.25 KB`)

// plan 44: /explore/ and the function's catalog are what scripts/build-explore.mjs makes; its script is the current build, ≤ 3 KB gzip
{
  let built
  try {
    built = renderExplore({ site: SITE })
  } catch (e) {
    fail(`/explore/: ${e.message}`)
  }
  if (built) {
    const bare = (h) => h.replace(/\s+/g, '')
    if (bare(html[EXPLORE]) !== bare(built.html))
      fail(`${EXPLORE}: not what scripts/build-explore.mjs makes (run it after the other generators, then Prettier)`)
    if (!existsSync(join(SITE, 'api/_catalog.mjs')) || read(join(SITE, 'api/_catalog.mjs')) !== built.catalog)
      fail('site/api/_catalog.mjs: not what scripts/build-explore.mjs makes')
  }
  // owner 2026-11-27: every blog page (index, topics, product stories, articles) is in the catalog, so a new article cannot be left out;
  // form entries render as form links whatever their url says (Codex 2026-11-27), and urls are compared as written: the catalog uses canonical addresses
  const listed = new Set(
    Object.values(JSON.parse(read('site-src/explore.json')).entries)
      .filter((e) => !e.form)
      .map((e) => e.url),
  )
  // redesign R5: and every module page, demo and docs landing page (the module column rows)
  const MODULE_PAGES = ['/bulma/', '/goten/', '/trunks/', '/bulma/demo/', '/trunks/demo/', '/demos/', ...DEMO_MODULES.map((m) => `/demos/${m}/`), '/docs/']
  for (const url of [...BLOGS, ...MODULE_PAGES, ...DOCS_SPEC.products.map((p) => `/docs/${p.id}/`)])
    if (!listed.has(url)) fail(`site-src/explore.json: ${url} is not in the Explore catalog`)
  const out = mkdtempSync(join(tmpdir(), 'site-check-'))
  try {
    execFileSync('npx', ['--no-install', 'rolldown', 'site-src/explore.js', '-f', 'iife', '-m', '-o', join(out, 'explore.js')], { stdio: 'pipe' })
    if (read(join(out, 'explore.js')) !== read(join(SITE, 'explore.js')))
      fail('site/explore.js is not the current build of site-src/explore.js (run npm run site:build)')
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
  const egz = gzipSync(readFileSync(join(SITE, 'explore.js'))).length
  if (egz > 3072) fail(`site/explore.js is ${egz} bytes gzip, over 3 KB`)
}

// R14: step cards are set in type; obsolete video assets must not return. Allowed: the closing section's loop, the film, the blog's figure loops.
const BLOG_LOOPS = ['reconciliation', 'closing', 'exit', 'inbox', 'verification']
const ALLOWED_CLIPS = [
  join('img', 'valley-loop.mp4'),
  join('media', 'goten-film.mp4'),
  join('media', 'trunks-film.mp4'),
  join('media', 'bulma-film.mp4'),
  join('media', 'vegeta-film-wide.mp4'),
  join('media', 'vegeta-film.mp4'),
  join('media', 'vegeta-loop.mp4'),
  ...BLOG_LOOPS.map((n) => join('media', 'blog', n + '.mp4')),
  ...EDUCATION.articles
    .flatMap((a) => [a.hero.film ? `${a.slug}-film` : a.slug, ...(a.figures ?? []).map((_, i) => `${a.slug}-${i + 1}`)])
    .map((n) => join('media', 'blog', 'edu', n + '.mp4')),
]
const clips = walk(SITE).filter((f) => f.endsWith('.mp4') && !ALLOWED_CLIPS.includes(relative(SITE, f)))
if (clips.length) fail('obsolete step clips remain: ' + clips.map((f) => relative(SITE, f)).join(', '))

// ---- Plan 26: the education articles. Each has its own figure; the media match their reviewed manifest; the pages stay plain pages. ----
{
  const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
  const dir = join(SITE, 'media', 'blog', 'edu')
  const { files: manifest, specs } = JSON.parse(read('site-src/education-figures.json'))
  const pages = JSON.parse(read('site-src/education-pages.json'))
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const topicPage = (a) => html[`/blog/${EDUCATION.categories.find((c) => c.id === a.category).anchor}/`].replace(/\s+/g, ' ')
  const figuresOf = (a) => (a.figures ?? []).map((_, i) => `${a.slug}-${i + 1}`)
  const want = EDUCATION.articles
    .flatMap((a) => [
      `${a.slug}.webp`,
      `${a.slug}-card.webp`,
      `${a.slug}-share.jpg`,
      ...(a.hero.film ? [`${a.slug}-film.mp4`, `${a.slug}-film.vtt`] : [`${a.slug}.mp4`]),
      ...figuresOf(a).flatMap((n) => [`${n}.webp`, `${n}.mp4`]),
    ])
    .sort()
  const have = existsSync(dir) ? readdirSync(dir).sort() : []
  if (JSON.stringify(have) !== JSON.stringify(want)) fail('education: site/media/blog/edu does not match the articles')
  if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(want)) fail('education: the figure manifest does not match the articles')
  for (const f of have) {
    if (manifest[f] !== sha(join(dir, f))) fail(`education: ${f} changed after its review`)
    if (f.endsWith('.mp4') && statSync(join(dir, f)).size > (f.endsWith('-film.mp4') ? 7.5e6 : 1.5e6)) fail(`education: ${f} is too large`)
    if (f.endsWith('.vtt') && (!read(join(dir, f)).startsWith('WEBVTT\n') || (read(join(dir, f)).match(/ --> /g) ?? []).length < 3))
      fail(`education: ${f} is not a WebVTT file with captions`)
    if (f.endsWith('-film.mp4')) {
      const start = readFileSync(join(dir, f)).subarray(0, 200000).toString('latin1')
      if (start.slice(4, 8) !== 'ftyp' || !start.includes('moov') || !start.includes('soun') || !start.includes('vide'))
        fail(`education: ${f} is not a film with picture and sound`)
    }
  }
  if (new Set(EDUCATION.articles.map((a) => a.hero.art)).size !== EDUCATION.articles.length) fail('education: two articles share a scene')
  for (const a of EDUCATION.articles) {
    const url = `/blog/${a.slug}/`
    const page = html[url].replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ')
    const want = pages[a.slug]
    if (!want) {
      fail(`${url}: not in site-src/education-pages.json`)
      continue
    }
    const body = /<article class="article">([\s\S]*)<\/article>/.exec(page)?.[1] ?? ''
    if (/mailto:|@/.test(body)) fail(`${url}: no email address in the article`)
    if (digest(html[url]) !== want.digest) fail(`${url}: the article text changed after its review`)
    if (JSON.stringify(labelsIn(html[url])) !== JSON.stringify(want.labels)) fail(`${url}: a figure's description changed after its review`)
    if (
      specs[a.slug] !==
      createHash('sha256')
        .update(JSON.stringify({ hero: a.hero, figures: a.figures ?? [] }))
        .digest('hex')
    )
      fail(`${url}: the figures were not rendered from the current specification`)
    const figure = `<figure class="article__media"> ?<video data-ambient muted loop playsinline preload="none" width="904" height="946" tabindex="-1" poster="/media/blog/edu/${a.slug}\\.webp" aria-label="[^"]{20,}" ?> ?<source src="/media/blog/edu/${a.slug}\\.mp4" type="video/mp4" ?/> ?</video> ?</figure>`
    const film = `<figure class="article__media"> ?<video data-captions="/media/blog/edu/${a.slug}-film\\.vtt" data-film controls playsinline preload="none" width="864" height="1080" poster="/media/blog/edu/${a.slug}\\.webp" aria-label="[^"]{20,}" ?> ?<source src="/media/blog/edu/${a.slug}-film\\.mp4" type="video/mp4" ?/> ?</video> ?</figure>`
    if (!new RegExp(a.hero.film ? film : figure).test(body)) fail(`${url}: its figure is missing or broken`)
    for (const n of figuresOf(a)) {
      const inner = `<figure class="article__media article__media--wide"> ?<video data-ambient muted loop playsinline preload="none" width="904" height="702" tabindex="-1" poster="/media/blog/edu/${n}\\.webp" aria-label="[^"]{20,}" ?> ?<source src="/media/blog/edu/${n}\\.mp4" type="video/mp4" ?/> ?</video> ?</figure>`
      if (!new RegExp(inner).test(body)) fail(`${url}: figure ${n} is missing or broken`)
    }
    if (!isDate(a.updated ?? EDUCATION.updated)) fail(`${url}: the update date is not a real day written like 7 November 2026`)
    if (
      !body.includes(`<p class="article__date"> Updated ${a.updated ?? EDUCATION.updated} </p>`) &&
      !body.includes(`<p class="article__date">Updated ${a.updated ?? EDUCATION.updated}</p>`)
    )
      fail(`${url}: no update date`)
    if (!new RegExp(`<h1 class="article__title"> ?${escapeRe(want.title)} ?</h1>`).test(body)) fail(`${url}: the heading changed`)
    if (!new RegExp(`<p class="article__lede"> ?${escapeRe(want.summary)} ?</p>`).test(body)) fail(`${url}: the summary changed`)
    if (!page.includes(`<title>${want.title} | Vegeta</title>`)) fail(`${url}: the title differs from the heading`)
    if (!page.includes(`<meta name="description" content="${want.summary}" />`)) fail(`${url}: the description differs from the summary`)
    const card = `<a href="${url}" ?> ?<img src="/media/blog/edu/${a.slug}-card\\.webp"[^>]*> ?<h3> ?${escapeRe(want.title)} ?</h3> ?<p> ?${escapeRe(want.summary)} ?</p> ?</a ?>`
    if (!new RegExp(card).test(topicPage(a))) fail(`${a.slug}: its card on the topic page is wrong`)
    const blogCards = html[BLOG_LIST].replace(/\s+/g, ' ')
    const onBlog =
      EDUCATION.start.includes(a.slug) ||
      EDUCATION.articles
        .filter((o) => o.category === a.category)
        .slice(0, 6)
        .includes(a)
    if (
      onBlog &&
      !new RegExp(card.replace('<img src=', '(?:<span class="blogcards__film" ?> ?)?<img src=').replace('> ?<h3>', '> ?(?:</span ?> ?)?<h3>')).test(blogCards)
    )
      fail(`/blog/: the card for ${a.slug} is wrong`)
    if (!page.includes(`<meta property="og:image" content="https://vegeta-ops.vercel.app/media/blog/edu/${a.slug}-share.jpg" />`))
      fail(`${url}: not its own share picture`)
    const next = [...(/<nav class="article__next"[\s\S]*?<\/nav>/.exec(body)?.[0] ?? '').matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    if (
      JSON.stringify(next) !== JSON.stringify((a.next ?? []).map((s) => `/blog/${s}/`)) ||
      new Set(next).size !== 2 ||
      next.includes(url) ||
      next.some((u) => !EDU_URLS.includes(u))
    )
      fail(`${url}: keep-reading links are not the two chosen articles`)
    if (!page.includes(`<link rel="canonical" href="https://vegeta-ops.vercel.app${url}" />`)) fail(`${url}: canonical URL`)
  }
}

// ---- Plan 22: the blog. The worked examples are recomputed with the pinned code; every number readers see is listed. ----
{
  const gbp = (pence) => '£' + (pence / 100).toLocaleString('en-GB')
  const gbp2 = (pence) => '£' + (pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })
  const stored = JSON.parse(read('site-src/blog-example.json'))
  const example = computeExample(GOTEN, TRUNKS)
  if (JSON.stringify(stored) !== JSON.stringify(example))
    fail('blog: site-src/blog-example.json is not what the pinned code computes (node scripts/blog-example.mjs --write)')
  const { goten: g } = example

  // every figure file is bound to this example and these releases
  const manifest = JSON.parse(read('site-src/blog-figures.json'))
  const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
  if (manifest.example !== sha('site-src/blog-example.json')) fail('blog: the figures were rendered from a different example (scripts/render-blog-figures.py)')
  // Bulma's figures show its screen words, so moving bulma.ref means rendering them again and checking the words
  if (manifest.gotenRef !== read('goten.ref').trim() || manifest.trunksRef !== read('trunks.ref').trim() || manifest.bulmaRef !== read('bulma.ref').trim())
    fail('blog: the figures were rendered at other releases')
  const figureDir = join(SITE, 'media', 'blog')
  const figureFiles = readdirSync(figureDir)
    .filter((f) => f !== 'edu')
    .sort()
  if (JSON.stringify(figureFiles) !== JSON.stringify(Object.keys(manifest.files).sort())) fail('blog: site/media/blog does not match the figure manifest')
  for (const f of figureFiles) {
    if (manifest.files[f] !== sha(join(figureDir, f))) fail(`blog: ${f} changed after its review`)
    if (f.endsWith('.mp4') && statSync(join(figureDir, f)).size > 1.5e6) fail(`blog: ${f} is over 1.5 MB`)
  }

  const article = (url, { title, summary, film, numbers, figures, phrases }) => {
    const page = html[url]
    const body = /<article class="article">([\s\S]*)<\/article>/.exec(page)?.[1] ?? ''
    if (!body) fail(`${url}: no article`)
    const text = plain(body).replace(/\s+/g, ' ')
    const metaOf = (key) => new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`).exec(page)?.[1]
    const unquote = (v) => plain(v ?? '')
    if (unquote(/<title>([^<]*)<\/title>/.exec(page)?.[1]) !== `${title} | Vegeta`) fail(`${url}: <title> changed`)
    for (const key of ['og:title', 'twitter:title']) if (unquote(metaOf(key)) !== `${title} | Vegeta`) fail(`${url}: ${key} differs from the title`)
    for (const key of ['description', 'og:description', 'twitter:description'])
      if (unquote(metaOf(key)) !== summary) fail(`${url}: ${key} differs from the summary`)
    for (const key of ['og:image:alt', 'twitter:image:alt']) if (metaOf(key) !== title) fail(`${url}: ${key} is not the article's title`)
    for (const phrase of phrases) if (!text.includes(phrase)) fail(`${url}: "${phrase}" missing`)
    if (/mailto:|@/.test(body)) fail(`${url}: no email address in the article`)
    // figures: exact descriptions, built from the example where they carry its figures
    const seenFigures = [...body.matchAll(/\/media\/blog\/([a-z-]+)\.(?:webp|mp4)/g)].map((m) => m[1])
    for (const [name, description] of Object.entries(figures)) {
      if (!seenFigures.includes(name)) fail(`${url}: figure ${name} missing`)
      const tag = new RegExp(`<(?:img|video)\\b[^>]*/media/blog/${name}\\.webp[^>]*>`).exec(body)?.[0] ?? ''
      const said = /\b(?:alt|aria-label)="([^"]*)"/.exec(tag)?.[1]
      if (plain(said ?? '') !== description) fail(`${url}: the description of ${name} does not match its figures`)
      const loop = BLOG_LOOPS.includes(name)
      if (loop !== /<video\b/.test(tag)) fail(`${url}: ${name} is the wrong kind of figure`)
      if (loop && !new RegExp(`<video\\b[^>]*/media/blog/${name}\\.webp[^>]*>\\s*<source src="/media/blog/${name}\\.mp4"`).test(body))
        fail(`${url}: ${name} plays another figure's loop`)
      if (
        loop &&
        (!/\bdata-ambient\b/.test(tag) || !/\bmuted\b/.test(tag) || !/preload="none"/.test(tag) || /\bautoplay\b/.test(tag) || /\bcontrols\b/.test(tag))
      )
        fail(`${url}: ${name} must be a muted figure loop that loads when visible`)
    }
    // the film: plays when asked, from its own part, with captions
    const video = /<video\b[^>]*\bdata-film\b[^>]*>/.exec(body)?.[0] ?? ''
    if (film) {
      if (!/\bcontrols\b/.test(video) || !/preload="none"/.test(video) || /\bautoplay\b/.test(video))
        fail(`${url}: the film must have controls, preload none, no autoplay`)
      if (!/\baria-label="[^"]+"/.test(video)) fail(`${url}: the film has no accessible name`)
      if (!video.includes(`poster="/media/${film}-film-poster.jpg"`)) fail(`${url}: the film has the wrong poster`)
      if (!body.includes(`<source src="/media/${film}-film.mp4" type="video/mp4"`)) fail(`${url}: the article plays the wrong film`)
      if (!body.includes(`data-captions="/media/${film}-film.vtt"`)) fail(`${url}: the film has no captions`)
    } else if (video) fail(`${url}: a film is on the page but not in its check`)
    // what readers see is held to the same lists
    const seen = [
      text,
      /<title>([^<]*)<\/title>/.exec(page)?.[1] ?? '',
      ...[...body.matchAll(/\b(?:alt|aria-label)="([^"]*)"/g)].map((m) => m[1]),
      ...['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].map((key) => metaOf(key) ?? ''),
    ].join(' \n ')
    const updated = /<p class="article__date">Updated (\d{1,2}) [A-Z][a-z]+ (\d{4})<\/p>/.exec(body)?.slice(1) ?? []
    const allowed = new Set([...numbers, ...updated]) // the update date
    for (const [n] of seen.matchAll(/\d[\d,.]*\d|\d/g)) if (!allowed.has(n)) fail(`${url}: number ${n} is not on the checked list`)
    for (const re of [
      /you.re invited/i,
      /\bscreenshots?\b/i,
      /will you join/i,
      /more modules/i,
      /calls that matter/i,
      /money is gone/i,
      /\bcustomers?\b/i,
      /\bfaster\b/i,
      /\d+\s?x\b/i,
      /saves? hours/i,
      /time saved/i,
      /\bdesigned\b/i,
      /\bAI\b/,
    ])
      if (re.test(seen)) fail(`${url}: says ${re}`)
    for (const [re, what] of NO_CLAIMS) if (re.test(seen)) fail(`${url}: mentions ${what} in its text, metadata or figure descriptions`)
    return text
  }

  // Goten: one uncertain receipt, carried through
  const candidate = g.uncertainBefore.candidates[0]
  if (g.uncertainBefore.candidates.length !== 1 || candidate.name !== 'Piccolo')
    fail(`blog: Goten no longer suggests only Piccolo: ${JSON.stringify(g.uncertainBefore.candidates)}`)
  if (g.exactMatch.status !== 'auto' || g.uncertainBefore.status !== 'suggested' || g.uncertainAfter.status !== 'confirmed' || !g.before.handoffBlocked)
    fail('blog: the Goten example no longer shows an exact match, a suggestion and a confirmation')
  const row = (name) => g.close.rows.find((r) => r.name === name)
  const x = EXAMPLE_INPUT.exit
  const stepNames = ['Return of capital', 'Preferred return (hurdle)', 'Lead catch-up', 'Carried interest split, 80 / 20']
  if (g.duplicate.includes('auto')) fail('blog: Goten now books a suspected duplicate automatically')
  if (g.exit.capital !== g.close.totals.invested) fail('blog: exit capital is not the amount invested')
  if (x.proceeds !== x.exitCosts + g.exit.investorsTotal + g.exit.carry) fail('blog: the exit does not add up')
  article(BLOG_GOTEN, {
    title: 'The money work on an SPV, ready for a person to check',
    summary: 'What Goten prepares at each step of the money work on an SPV, from bank statement to exit, and what a person still decides.',
    film: 'goten',
    numbers:
      '001 0.55 2,000 23,000 25,000 3 10,000 300 9,700 60 1,940 750 24,250 90,000 1,500 1,500.00 20 8 24,250.00 11,381.21 2,845.30 40,018.79 10,004.70 75,650.00 12,850.00 80 6,052'.split(
        ' ',
      ),
    figures: {
      reconciliation: `Goten reconciliation. S GOKU is matched to Son Goku by the reference SEN-001. PICCOLO has no reference, is suggested as Piccolo with a score of ${candidate.score.toFixed(2)} because the payer name and amount match, and is confirmed by a person.`,
      closing: `Goten closing allocation for six investors: ${gbp(g.close.totals.received)} cash received, ${gbp(g.close.totals.investorFees)} investor fees, ${gbp(g.close.totals.wire)} to wire to the company.`,
      wrong: 'By hand: a missing reference, a payment made twice, a fee on the wrong base, carry taken before capital.',
      gets: 'Goten, ready to check: ledger, chase emails, closing confirmation, exit split and activity log.',
      person: 'A person still decides uncertain payments, sends every message, gets every consent and makes every wire and refund.',
      exit: `Goten exit distribution: return of capital, preferred return, lead catch-up and carry split, totalling ${gbp2(g.exit.investorsTotal)} to investors and ${gbp2(g.exit.carry)} to the lead.`,
    },
    phrases: [
      `Six investors owe ${gbp(g.after.booked)} between them`,
      'Goten has no connection to your bank',
      'the payment reference of exactly one investor',
      'A suspected duplicate would still wait for a person',
      `PICCOLO, ${gbp(row('Piccolo').received)}, with no reference`,
      `Goten suggests Piccolo with a score of ${candidate.score.toFixed(2)}`,
      'the payer name matches and the amount matches',
      `${gbp(g.before.booked)} is booked, ${gbp(g.before.unbooked)} is unbooked, and the reconciliation cannot be carried to the close until someone decides`,
      `Now ${gbp(g.after.booked)} is booked and nothing is left over`,
      'which Goten does not run',
      `With a ${EXAMPLE_INPUT.feeBps / 100}% investor fee deducted from each payment`,
      `Goku's ${gbp(row('Son Goku').received)} becomes ${gbp(row('Son Goku').fees)} in fees and ${gbp(row('Son Goku').invested)} invested`,
      `Piccolo's confirmed ${gbp(row('Piccolo').received)} becomes ${gbp(row('Piccolo').fees)} and ${gbp(row('Piccolo').invested)}`,
      `${gbp(g.close.totals.investorFees)} in fees and ${gbp(g.close.totals.invested)} invested, and ${gbp(g.close.totals.wire)} is the amount to wire`,
      'Goten moves no money',
      'If a blocking check fails',
      `brings in ${gbp(x.proceeds)}, five years on, with ${gbp(x.exitCosts)} of costs, ${x.carry.k / 100}% carry, an ${x.carry.h / 100}% a year compounding hurdle and full catch-up`,
      `Costs of ${gbp2(x.exitCosts)} are paid first`,
      'a query asking a likely sender whether an unmatched payment is theirs, and a chase for an investor who is short',
      ...g.exit.steps.map((st, i) => [stepNames[i], st.toInvestors ? gbp2(st.toInvestors) : '', st.toLead ? gbp2(st.toLead) : ''].filter(Boolean).join(' ')),
      `Total ${gbp2(g.exit.investorsTotal)} ${gbp2(g.exit.carry)}`,
      `Piccolo's ${gbp(row('Piccolo').invested)} comes back as ${gbp(g.exit.rows.find((r) => r.name === 'Piccolo').distribution)}`,
      'one investment and one exit. Each investor can have their own carry rate; the hurdle, catch-up and years held are the same for the whole deal',
      'Your deal data is processed in your browser and never sent by this app',
    ],
  })

  // Trunks: every figure and quoted reply is held to the release notes and the default templates at trunks.ref
  const templates = read(join(TRUNKS, 'config/default/templates.yaml'))
  for (const words of [
    'is paid in full',
    'Bank transfers can take a few working days to arrive',
    'please reply with the name of the deal and the payment reference',
  ])
    if (!templates.includes(words)) fail(`blog: the Trunks templates no longer say: ${words}`)
  if (!/^\s*\| Malicious bank-detail changes or look-alike senders rated high \|[^|]*\|\s*100% \(18\/18\)\s*\|/m.test(currentInboxNotes))
    fail('blog: 18 of 18 is not in the Trunks release notes')
  if (!/^\s*\| Contact, commitment and deal linked correctly \|[^|]*\|\s*[\d.]+% \(123\/125\)\s*\|/m.test(currentInboxNotes))
    fail('blog: 123 of 125 is not in the Trunks release notes')
  // the article labels these as measured on the measured release, so they are held to that release's notes
  if (!/held-out set of 126 emails/.test(measuredInboxNotes)) fail('blog: 126 is not in the Trunks release notes')
  if (!/in both blind sets the qualifying samples were pacs\.008/.test(measuredInboxNotes))
    fail('blog: the pacs.008 coverage note is not in the Trunks release notes')
  if (!read(join(TRUNKS, 'docs/en/security-model.md')).includes('default 24 hours')) fail('blog: 24 hours is not the Trunks default')
  // the rule came with v0.4.0; the current role table must still give it to approvers and admins only
  if (!read(join(TRUNKS, 'docs/en/use/roles.md')).includes('| Close a case that is not ready to close, with a reason | No | Yes | Yes |'))
    fail('blog: closing with a task open is not the Trunks rule')
  article(BLOG_TRUNKS, {
    title: 'Every investor email, ready for a person',
    summary: 'What Trunks prepares for each kind of email an SPV or syndicate receives, and what a person still decides.',
    film: 'trunks',
    numbers: `10,000.00 001 1,000.00 005 24 126 5.5 18 123 125 103 008 9 ${trunksVersion} ${trunksMeasuredVersion}`.split(' '),
    figures: {
      inbox: 'Trunks inbox with four investor emails. The first, Did my payment arrive? from Son Goku, is selected.',
      reply:
        'Trunks reply to Son Goku, from the ledger: We have received GBP 10,000.00 for Senzu Labs (reference SEN-001). Your commitment of GBP 10,000.00 is paid in full. Approved, with a button to copy the text.',
      verification:
        'Trunks verification for a change of bank account, rated high risk with a look-alike domain: call the number on file, cooling-off of 24 hours by default, then approval by a second person, still waiting.',
      evidence:
        "Trunks payment confirmation from Yamcha: GBP 1,000.00, reference SEN-005, with its value date and UETR. Not in your ledger yet: the sender's confirmation, not proof of receipt.",
    },
    phrases: [
      'Trunks connects to the mailbox read-only',
      'the model can never lower it',
      'Trunks never sends email',
      'Only your imported ledger can show a payment as received',
      'printed PDF',
      'A valid message whose beneficiary account is not on the list goes to high risk',
      '24 hours by default',
      'It has no connection to your bank and cannot stop a payment',
      'An approver or admin can still close a case with its task open, giving a reason',
      'a taken-over mailbox would pass',
      'One run with one model, Claude Opus 5.5, on 126 test emails that development never read',
      `measured on v${trunksMeasuredVersion}`,
      'rated high in 18 of 18',
      'linked correctly in 123 of 125',
      'were all pacs.008',
      `Trunks v${trunksVersion} runs on your own server with Docker`,
    ],
  })

  // Bulma (plan 39 S5): the story deal from set-up to payment instructions; the test figures are the release notes' own
  const bulmaTests = [
    ['1,246', 'unit and real-database tests'],
    ['41', 'browser tests'],
    ['201', 'test-plan cases'],
    ['1,878', 'full mutation run'],
    ['35,084', 'random and boundary cases'],
  ]
  for (const [n, what] of bulmaTests) if (!bulmaBacked(n, what)) fail(`${BLOG_BULMA}: ${n} ${what} is not in the v${bulmaVersion} release notes`)
  article(BLOG_BULMA, {
    title: 'Start a deal and bring your investors in',
    summary:
      'Set up and submit your deal for review. Once approved, go live, invite investors and follow their progress from commitment to payment instructions.',
    film: 'bulma',
    numbers: ['10,000', '19', ...bulmaTests.map(([n]) => n), bulmaVersion],
    figures: {
      'bulma-follow':
        'Bulma investor list: Son Goku, to pay, waiting on the investor; Yamcha, to sign, waiting on the investor; Krillin, verifying, waiting on a reviewer; Tien, funded.',
      'bulma-setup': 'Bulma deal for Senzu Labs: basics, company, terms, files and economics done, review not yet done. Nothing is missing. Submit for review.',
      'bulma-invite':
        'Bulma links: Default carry, no fee; Senzu lead fee, with a lead fee added on top of the commitment, which all four investors joined; and Co-investors, which is waiting for a reviewer.',
      'bulma-pay':
        'Bulma payment instructions: the amount to pay, how it is made up, the payment reference, the date to pay by, and the receiving account and who holds it. Download as PDF.',
    },
    phrases: [
      'A reviewer at the operator approves it before any investor can see it',
      'A reviewer cannot review a deal they lead, help run or earn carry on',
      'An email invitation works only for the address it was sent to',
      'Neither the link nor the email shows the company, the amounts or the terms',
      "Bulma's own emails never include bank details",
      'This first version does not handle the closing itself',
      'it does not mark the money as received',
      'A lead cannot mark a payment as received',
      'Bulma does not move money, hold shares or run a wallet',
      "It does not take on the operator's regulatory duties",
      `Bulma v${bulmaVersion} runs on the operator's own server with Docker`,
    ],
  })

  // the list page links to exactly the published articles
  const listBody = /<main\b[\s\S]*<\/main>/.exec(html[BLOG_LIST])?.[0] ?? ''
  const listed = [...listBody.matchAll(/<li[^>]*>\s*<a href="([^"]+)"/g)].map((m) => m[1]).join(' ')
  const hrefOf = (a) => `/blog/${a.slug}/`
  const bySlug = (s) => EDUCATION.articles.find((a) => a.slug === s)
  const wanted = [
    ...EDUCATION.start.map(bySlug),
    ...EDUCATION.categories.flatMap((c) => EDUCATION.articles.filter((a) => a.category === c.id).slice(0, 6)),
  ].map(hrefOf)
  if (listed !== wanted.join(' ')) fail(`${BLOG_LIST}: links to ${listed}`)
  for (const c of EDUCATION.categories) {
    const url = `/blog/${c.anchor}/`
    const links = [...(/<main\b[\s\S]*<\/main>/.exec(html[url])?.[0] ?? '').matchAll(/<li[^>]*>\s*<a href="([^"]+)"/g)].map((m) => m[1]).join(' ')
    if (
      links !==
      EDUCATION.articles
        .filter((a) => a.category === c.id)
        .map(hrefOf)
        .join(' ')
    )
      fail(`${url}: links to ${links}`)
    if (!new RegExp(`<a href="${url}" aria-current="page"`).test(html[url])) fail(`${url}: its topic is not marked current`)
  }
  // both files are generated, so they must be exactly this text: a page missing, a foreign address or a Disallow all fail
  const SITE_URL = 'https://vegeta-ops.vercel.app'
  const sitemapPages = [
    '/',
    '/bulma/',
    '/goten/',
    '/trunks/',
    '/demos/',
    ...DEMO_MODULES.map((m) => `/demos/${m}/`),
    BLOG_LIST,
    ...BLOG_TOPICS,
    BLOG_GOTEN,
    BLOG_TRUNKS,
    BLOG_BULMA,
    ...EDU_URLS,
    POLICY,
    EXPLORE,
    ...DOCS,
  ]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPages.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`
  if (!existsSync(join(SITE, 'sitemap.xml')) || read(join(SITE, 'sitemap.xml')) !== sitemap) fail('sitemap.xml is not exactly the list of pages')
  if (!existsSync(join(SITE, 'robots.txt')) || read(join(SITE, 'robots.txt')) !== `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`)
    fail('robots.txt is not the expected file')
  if (JSON.stringify([...sitemapPages, NOT_FOUND].sort()) !== JSON.stringify(Object.keys(html).sort()))
    fail('the sitemap list and the checked pages differ (the not-found page is checked and not listed)')
  const feat = EDUCATION.featured
  const flatList = listBody.replace(/\s+/g, ' ')
  const featured = `<a class="blogfeature" href="${feat.href}" ?> ?<img src="${feat.card}"[^>]*> ?<span ?> ?<small ?>${feat.tag}</small ?> ?<strong ?>${feat.title} ?</strong ?> ?<em ?> ?${feat.summary} ?</em ?> ?</span ?> ?</a ?>`
  if (feat.href !== BLOG_GOTEN || !new RegExp(featured).test(flatList)) fail(`${BLOG_LIST}: the featured article is wrong`)
  const cardOrder = [...flatList.matchAll(/<a class="blogfeature"[^>]*> ?<img[^>]*> ?<span ?> ?<small ?>([A-Za-z]+)<\/small/g)].map((m) => m[1]).join(',')
  if (cardOrder !== 'Bulma,Goten,Trunks') fail(`${BLOG_LIST}: the module cards are ${cardOrder}, expected Bulma, Goten, Trunks (owner 2026-11-23)`)
  if (!html[BLOG_GOTEN].replace(/\s+/g, ' ').includes(`<p class="article__date">Updated ${EDUCATION.updated}</p>`)) fail(`${BLOG_GOTEN}: no update date`)
  for (const [url, picture] of [
    [BLOG_GOTEN, 'goten-share.jpg'],
    [BLOG_TRUNKS, 'trunks-share.jpg'],
    [BLOG_BULMA, 'bulma-share.jpg'],
  ])
    if (
      !html[url].includes(`<meta property="og:image" content="https://vegeta-ops.vercel.app/media/${picture}" />`) ||
      !existsSync(join(SITE, 'media', picture))
    )
      fail(`${url}: not its own share picture`)
  if (!(html['/'].match(/<a href="\/blog\/">Blog<\/a>/g) ?? []).length) fail('/: the footer has no Blog link')

  // the films and their captions: real files, in order, inside the film, placed clear of the film's own text, and scanned like a page.
  // Every block is read, so a malformed one fails instead of dropping out of the count. line:3% is the top of the picture: the film's text sits low
  // An iPhone plays them inline only from a file that starts with its index (faststart), in H.264 at level 4.0 or lower, like the home reel.
  // The Bulma film is 70 seconds, so it gets more room at the same bit rate. Its first caption is the invitation that opens it (plan v4)
  for (const [film, seconds, count, mb] of [
    ['goten', 36, 9, 8],
    ['trunks', 40, 15, 8],
    ['bulma', 71, 17, 12.5],
  ]) {
    const file = join(SITE, 'media', `${film}-film.mp4`)
    if (statSync(file).size > mb * 1e6) fail(`blog: the ${film} film is over ${mb} MB`)
    const head = readFileSync(file).subarray(0, 300000).toString('latin1')
    const moov = head.indexOf('moov')
    if (head.slice(4, 8) !== 'ftyp' || moov < 0 || (head.indexOf('mdat') >= 0 && head.indexOf('mdat') < moov))
      fail(`blog: the ${film} film does not start with its index (faststart), so an iPhone cannot play it while it downloads`)
    const avcC = head.indexOf('avcC', head.indexOf('stsd')) // then version, profile, compatibility, level
    if (avcC < 0 || head.charCodeAt(avcC + 7) > 40) fail(`blog: the ${film} film is not H.264 at level 4.0 or lower`)
    const vtt = read(join(SITE, 'media', `${film}-film.vtt`))
    if (!vtt.startsWith('WEBVTT\n')) fail(`blog: the ${film} captions are not a WebVTT file`)
    const blocks = vtt
      .trim()
      .split(/\n\s*\n/)
      .slice(1)
    if (blocks.length !== count) fail(`blog: ${blocks.length} ${film} captions, expected ${count}`)
    let last = 0
    blocks.forEach((block, i) => {
      const [number, timing, ...words] = block.split('\n')
      const m = /^(\d\d):([0-5]\d):([0-5]\d)\.(\d{3}) --> (\d\d):([0-5]\d):([0-5]\d)\.(\d{3}) line:3%$/.exec(timing ?? '')
      if (number !== String(i + 1) || !m || !words.join('').trim()) {
        fail(`blog: ${film} caption ${i + 1} is malformed: ${timing}`)
        return
      }
      const from = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
      const to = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
      if (from < last || to <= from || to > seconds) fail(`blog: ${film} caption times out of order at ${timing}`)
      last = to
    })
    for (const [re, what] of PRIVATE_TERMS) if (re.test(vtt)) fail(`blog: ${film} captions mention ${what}`)
    const opening = film === 'bulma' && /You have been invited to look at\s+a private investment opportunity\.\s*$/.test(blocks[0]) ? blocks[0] : ''
    if (/invited|calls that matter/i.test(vtt.replace(opening, ''))) fail(`blog: ${film} captions carry the film's ending`)
  }
}

// ---- Plan 32: the home page's film reel. The two cuts and the loop are what the reel plays, sized for the web, each with its index first;
// the button names the films' running time; the captions are the film's; the film is bound to the module releases it describes ----
{
  const mp4 = (name) => {
    const b = readFileSync(join(SITE, 'media', name)).subarray(0, 300000)
    const s = b.toString('latin1')
    const at = s.indexOf('mvhd')
    const v1 = b[at + 4] === 1
    const avc = s.indexOf('avc1', s.indexOf('stsd'))
    return {
      bytes: statSync(join(SITE, 'media', name)).size,
      indexFirst: s.slice(4, 8) === 'ftyp' && at > 0 && (s.indexOf('mdat') < 0 || at < s.indexOf('mdat')),
      sound: /hdlr[\s\S]{8}soun/.test(s), // the track's handler type, not any four bytes
      picture: avc > 0 ? `${b.readUInt16BE(avc + 28)}x${b.readUInt16BE(avc + 30)}` : '',
      seconds: at > 0 ? (v1 ? Number(b.readBigUInt64BE(at + 28)) : b.readUInt32BE(at + 20)) / b.readUInt32BE(at + (v1 ? 24 : 16)) : 0,
    }
  }
  const films = [
    ['vegeta-film-wide.mp4', '1920x1080', 45e6, true],
    ['vegeta-film.mp4', '1080x1350', 25e6, true],
    ['vegeta-loop.mp4', '1280x720', 1.5e6, false],
  ].map(([name, picture, max, sound]) => {
    const f = mp4(name)
    if (f.bytes > max) fail(`reel: ${name} is over ${max / 1e6} MB`)
    if (!f.indexFirst) fail(`reel: ${name} does not start with its index (faststart), so it cannot play while it downloads`)
    if (f.picture !== picture) fail(`reel: ${name} is ${f.picture || 'not H.264'}, expected ${picture}`)
    if (f.sound !== sound) fail(`reel: ${name} ${sound ? 'has no sound' : 'has sound'}`)
    return f
  })
  const [wide, upright] = films
  for (const [f, name] of [
    [wide, 'wide cut'],
    [upright, 'upright cut'],
  ])
    if (!(f.seconds > 60)) fail(`reel: the ${name} has no readable length`)
  if (!(Math.abs(wide.seconds - upright.seconds) <= 0.2)) fail('reel: the two cuts differ in length')
  const home = html['/']
  // plan 41: the open-source signal is shown, not announced: the hero leads to the code
  const heroBox = /<section class="hero hero--overview"[\s\S]*?<\/section>/.exec(home)?.[0] ?? ''
  if (!/<a class="btn btn--quiet" href="https:\/\/github\.com\/vegeta-labs">View on GitHub/.test(heroBox))
    fail('/: the hero must link to the code on GitHub (plan 41)')
  // the headline the owner approved on 2026-11-20, with the module pages'
  // rotator: "Run your {word}" turns on its own line over a fixed "in-house."; the whole <h1> is pinned (Codex review 2026-11-20)
  const heroH1 = (/<h1 class="hero__title">([\s\S]*?)<\/h1>/.exec(heroBox)?.[1] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim()
  const heroWant =
    '<span class="sr-only">Your own SPV suite. Run your SPVs, syndicate and back office in-house.</span>' +
    '<span class="hero__line" aria-hidden="true">Your own SPV suite.</span>' +
    '<span class="hero__line rot" aria-hidden="true" data-rotator data-grey="rest" data-phrases="Run your:SPVs|Run your:syndicate|Run your:back office">' +
    '<span class="rot__item is-on"><span>Run your</span><span class="rot__verb"> SPVs</span></span></span>' +
    '<span class="hero__line" aria-hidden="true">in-house.</span>'
  if (heroH1 !== heroWant)
    fail('/: the hero must read "Your own SPV suite." / "Run your {SPVs / syndicate / back office}" / "in-house." with the module rotator (owner 2026-11-20)')
  // what a reader sees or hears, plus every rotating phrase
  const heroWords = (heroH1.replace(/<[^>]+>/g, ' ') + ' ' + (/data-phrases="([^"]*)"/.exec(heroH1)?.[1] ?? '')).replace(/\s+/g, ' ')
  if (/Bulma|Goten|Trunks|open.?source|end to end|platform/i.test(heroWords))
    fail('/: the hero headline names a module or says open-source, end to end or platform')
  const section = /<section class="reel" id="film"[^>]*>([\s\S]*?)<\/section>/.exec(home)?.[0] ?? ''
  if (!section) fail('/: the film reel is missing')
  else {
    const at = home.indexOf(section)
    if (
      at < home.indexOf('class="hero') ||
      [...(/<main\b[\s\S]*<\/main>/.exec(home)?.[0] ?? '').matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]).join() !==
        ['top', 'film', 'fits', 'modules', 'build', 'faq'].join()
    )
      fail('/: the page runs hero, film, Where it fits, Modules, Why trust Vegeta, FAQ, then the close (plan 41)')
    const time = /<span class="reel__t">(\d+):(\d\d)<\/span>/.exec(section)
    if (!time || +time[1] * 60 + +time[2] !== Math.round(wide.seconds))
      fail(`/: the reel button does not show the film's length (${Math.round(wide.seconds)} s)`)
    for (const need of [
      'href="/media/vegeta-film-wide.mp4"',
      'src="/media/vegeta-loop.mp4"',
      'src="/media/vegeta-reel.webp"',
      'data-captions="/media/vegeta-film.vtt"',
    ])
      if (!section.includes(need)) fail(`/: the reel lacks ${need}`)
    if (/\bdefault\b|\bautoplay\b/.test(section)) fail('/: the reel starts nothing by itself and its captions start off')
  }
  if (!existsSync(join(SITE, 'media', 'vegeta-reel.webp'))) fail('reel: the still is missing')
  const vtt = read(join(SITE, 'media', 'vegeta-film.vtt')).replace(/\r\n/g, '\n')
  const cues = vtt
    .trim()
    .split(/\n\s*\n/)
    .slice(1)
  if (!vtt.startsWith('WEBVTT\n') || cues.length !== 31) fail("reel: the captions are not the film's 31 narration lines (Cut 17)")
  let last = 0
  cues.forEach((cue, i) => {
    const [number, timing, ...words] = cue.split('\n')
    const m = /^(\d\d):([0-5]\d):([0-5]\d)\.(\d{3}) --> (\d\d):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(timing ?? '')
    if (number !== String(i + 1) || !m || !words.join('').trim()) return fail(`reel: caption ${i + 1} is malformed`)
    const from = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
    const to = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
    if (from < last || to <= from || to > wide.seconds) fail(`reel: caption ${i + 1} is out of order or past the end`)
    last = to
  })
  // the narration runs to the brand line near the end, so the captions must too
  if (last < wide.seconds - 8) fail('reel: the captions stop before the narration does')
  for (const [re, what] of PRIVATE_TERMS) if (re.test(vtt)) fail(`reel: the captions mention ${what}`)
  // the film shows Bulma, Goten and Trunks as released at these commits; a new release means watching the film again before moving the ref
  const claims = JSON.parse(read('site-src/film-claims.json'))
  for (const ref of ['bulma', 'goten', 'trunks'])
    if (claims[ref] !== read(`${ref}.ref`).trim())
      fail(
        `reel: ${ref}.ref moved from ${claims[ref]}, the release the film was checked against; re-check the film's claims and update site-src/film-claims.json`,
      )
  if (!(claims.claims?.length > 0) || claims.claims.some((c) => !c.says || !/^(bulma|goten|trunks)$/.test(c.module) || !c.evidence))
    fail('site-src/film-claims.json: every claim needs what it says, its module and its evidence')
}

// headers (K9: one rule for the whole site, unchanged)
const vercel = JSON.parse(read(join(SITE, 'vercel.json')))
if (vercel.headers[0]?.source !== '/(.*)') fail('vercel.json: the first header rule must cover the whole site')
// besides it, only the Markdown type (plan 31), so no rule can weaken the site-wide headers
const MD_TYPE = { source: '/(.*)\\.md', headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }] }
if (vercel.headers.length !== 2 || JSON.stringify(vercel.headers[1]) !== JSON.stringify(MD_TYPE))
  fail('vercel.json: expected the site-wide header rule and the Markdown type rule only')
const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
// the demo uses relative paths: /trunks/demo without the slash must redirect, or its files would resolve one level up
for (const r of [
  '/bulma',
  '/goten',
  '/trunks',
  '/trunks/demo',
  '/explore',
  ...(existsSync('bulma-demo.lock') ? ['/bulma/demo'] : []),
  ...[...BLOGS, ...DOCS].map((url) => url.slice(0, -1)),
])
  if (!(vercel.redirects ?? []).some((x) => x.source === r && x.destination === r + '/')) fail(`vercel.json: no redirect from ${r} to ${r}/`)
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'"
if (csp !== CSP) fail(`CSP is not the approved policy: ${csp}`)

if (problems.length) {
  console.error(`site check: ${problems.length} problem(s)\n- ` + problems.join('\n- '))
  process.exit(1)
}
console.log(
  `site check: OK (${Object.keys(PAGES).length} pages, demo v${JSON.parse(read('trunks-demo.lock')).version} locked, 7 source-checked illustrations, script ${gz} bytes gzip)`,
)
