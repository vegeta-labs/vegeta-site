// Project website checks (docs/en/SITE_HANDBOOK.md §6, §8; plan 13 §8.1 K1–K11). Exits 1 on any failure.
// Pages: / (the Deal Ops overview), /toolkit/, /inbox/ and the blog (plan 22); /inbox/demo/ is the Inbox's own demo package, checked against its lock.
// - CSP rules in every page: one external script (/site.js), no inline script, no style attribute, no <style>, no inline events
// - every local file a page or the stylesheet refers to exists; every anchor, on the page or on another page, has a target;
//   links go only to the site's own pages, the Toolkit app, the two public repos, the GitHub organisation and the feedback form
// - no page carries a mailto link or an e-mail address (the form replaces them; .example addresses are fine)
// - the footer is the same on every page, links to the feedback form and carries the Toolkit's disclaimer word for word
// - /toolkit/: the privacy and disclaimer sentences match the app word for word; FAQ rules; trust figures in the release notes
// - /inbox/: every figure is in the Inbox release notes; quoted words are Inbox UI text, template text or demo data; the
//   release notes' mailbox test-scope sentences are on the page word for word; FAQ rules
// - /inbox/demo/: the files are exactly the locked release package (hashes), built from inbox.ref; noindex; no inline script;
//   no secrets; only .example e-mail addresses in the snapshot
// - no page says what it must not (unverifiable claims, "in design", and a private list of terms)
// - old links to the Toolkit's sections (/#faq-…) have their target on /toolkit/ and none on /
// - site/site.js is the current build of site-src/site.js and is ≤ 6 KB gzip (handbook §6)
// - seven step illustrations match their pinned sample data; obsolete clips are rejected
// - the headers file carries the expected CSP
import { checkIllustrations, illustrationPattern } from './check-illustrations.mjs'
import { computeExample, INPUT as EXAMPLE_INPUT } from './blog-example.mjs'
import { digest, labelsIn } from './education-digest.mjs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'
import { runInNewContext } from 'node:vm'

const SITE = 'site'
// The apps' sentences, labels and release notes come from the public repos, checked out at the commits in toolkit.ref and
// inbox.ref (CI does this; locally: npm run toolkit:fetch && npm run inbox:fetch). TOOLKIT_DIR / INBOX_DIR override the location.
const TOOLKIT = process.env.TOOLKIT_DIR ?? 'vendor/toolkit'
const INBOX = process.env.INBOX_DIR ?? 'vendor/inbox'
for (const [dir, file, cmd] of [
  [TOOLKIT, 'src/config.ts', 'toolkit:fetch'],
  [INBOX, 'CHANGELOG.md', 'inbox:fetch'],
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
  ['TOOLKIT_DIR', TOOLKIT, 'toolkit.ref', 'toolkit:fetch'],
  ['INBOX_DIR', INBOX, 'inbox.ref', 'inbox:fetch'],
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
  /^https:\/\/(www\.legislation\.gov\.uk|www\.gov\.uk|handbook\.fca\.org\.uk|api-handbook\.fca\.org\.uk|www\.fca\.org\.uk|ilpa\.org|www\.investor\.gov|www\.sec\.gov|www\.nber\.org|conference\.nber\.org|www\.ycombinator\.com|www\.law\.cornell\.edu|delcode\.delaware\.gov|rodneywhitecenter\.wharton\.upenn\.edu|nvca\.org|www\.prarulebook\.co\.uk|www\.irs\.gov|www\.fscs\.org\.uk|www\.cambridgeassociates\.com|econpapers\.repec\.org|ideas\.repec\.org|www\.theaic\.co\.uk|www\.privateequityvaluation\.com|www\.nasa\.gov|www\.jstor\.org|www\.bakerdonelson\.com|www\.angelcapitalassociation\.org|media\.mcguirewoods\.com|eprints\.lse\.ac\.uk|academic\.oup\.com)\//
const BLOG_TOPICS = EDUCATION.categories.map((c) => `/blog/${c.anchor}/`)
const BLOG_TRUNKS = '/blog/every-investor-email/'
const BLOGS = [BLOG_LIST, ...BLOG_TOPICS, BLOG_GOTEN, BLOG_TRUNKS, ...EDU_URLS]
const PAGES = {
  '/': 'index.html',
  '/toolkit/': 'toolkit/index.html',
  '/inbox/': 'inbox/index.html',
  ...Object.fromEntries(BLOGS.map((url) => [url, url.slice(1) + 'index.html'])),
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
const inboxVersion = JSON.parse(read(join(INBOX, 'package.json'))).version
const releaseSection = (notes, v) => (new RegExp(`^## v${esc(v)}\\b[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm').exec(notes) ?? [''])[0]
const inboxNotesRaw = read(join(INBOX, 'CHANGELOG.md'))
const currentInboxNotes = releaseSection(inboxNotesRaw, inboxVersion)
if (!currentInboxNotes) fail(`Inbox release notes have no section for v${inboxVersion}`)
// A presentation-only patch may quote unchanged results from its explicitly named measured release.
const inboxMeasuredVersion = /were \*\*measured on v([0-9.]+)\*\*/.exec(currentInboxNotes)?.[1] ?? inboxVersion
const measuredInboxNotes = releaseSection(inboxNotesRaw, inboxMeasuredVersion)
if (!measuredInboxNotes) fail(`Inbox measurement release v${inboxMeasuredVersion} is missing`)
if (inboxMeasuredVersion !== inboxVersion) {
  const table = (s) =>
    s
      .split('\n')
      .filter((line) => /^\s*\|/.test(line))
      .join('\n')
  if (table(currentInboxNotes) !== table(measuredInboxNotes)) fail('Inbox carried-forward metric table differs from its measured release')
}
const metricCell = (label) => {
  const cell = new RegExp(`^\\s*\\| ${esc(label)} \\|[^|]+\\|\\s*([^|]+)\\|`, 'm').exec(currentInboxNotes)?.[1]?.trim()
  if (!cell) fail(`Inbox v${inboxVersion}: missing metric ${label}`)
  return cell ?? ''
}
const fractionFigure = (label) => {
  const m = /^100% \((\d+)\/(\d+)\)$/.exec(metricCell(label))
  if (!m || m[1] !== m[2] || Number(m[2]) === 0) {
    fail(`Inbox v${inboxVersion}: ${label} is not a measured perfect-recall fraction`)
    return ''
  }
  return `${m[1]} / ${m[2]}`
}
const inboxTrust = {
  high: fractionFigure('High-risk emails rated high'),
  malicious: fractionFigure('Malicious bank-detail changes or look-alike senders rated high'),
  injection: fractionFigure('Prompt injection does not change the judgement (vs. a clean twin)'),
  classification: metricCell('Classification, macro F1'),
}
if (!/^0\.\d{3}$|^1\.000$/.test(inboxTrust.classification)) fail(`Inbox v${inboxVersion}: invalid classification figure`)
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{}(),])\/\/.*$/gm, '$1')
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))

// the Inbox demo snapshot: its case ids are the targets of /inbox/demo/#case=… links
const DEMO = join(SITE, 'inbox/demo')
let snapshot = null
try {
  const box = {}
  runInNewContext(read(join(DEMO, 'data/snapshot.js')), { globalThis: box })
  snapshot = box.DOI_DEMO
} catch (e) {
  fail(`cannot read the demo snapshot: ${e.message}`)
}
const demoCases = new Set(Object.keys(snapshot?.details ?? {}))

// Validate all illustration text before excluding it from the page-level release-figure inventory.
try {
  checkIllustrations({ html, css, toolkit: TOOLKIT, inbox: INBOX, snapshot, fail })
} catch (error) {
  fail(`cannot validate illustration sources: ${error.message}`)
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
  /^https:\/\/(vegeta-ops\.vercel\.app(\/|$)|deal-ops-toolkit\.vercel\.app(\/|$)|github\.com\/vegeta-labs\/(goten|trunks)(\/|$)|github\.com\/vegeta-labs$)/
// encoded addresses display as real ones, so the address scan reads them decoded
const decodeForScan = (t) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(+n, 0x10ffff)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&commat;/gi, '@')
    .replace(/&period;/gi, '.')
    .replace(/%40/g, '@')
const FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd7sInr8uvQMiUPaVoDEmFGGu79NCoCVDUbqTYnYjxEr1VrDQ/viewform'
const footers = new Set()
for (const [url, h] of Object.entries(html)) {
  const at = (m) => `${url}: ${m}`
  const scripts = [...h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  if ((h.match(/<script\b/gi) ?? []).length !== 1 || scripts.length !== 1 || !/\bsrc="\/site\.js"/.test(scripts[0][1]) || scripts[0][2].trim())
    fail(at('page must have exactly one <script src="/site.js"></script> and no inline script'))
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
      if (ref !== FEEDBACK_FORM && !EXTERNAL.test(ref) && !(EDU_URLS.includes(url) && EDU_SOURCES.test(ref))) fail(at(`unexpected external link: ${ref}`))
      continue
    }
    const [path, hash] = ref.split('#')
    if (!path) {
      if (!ids.includes(hash)) fail(at(`anchor #${hash} has no target`))
      continue
    }
    if (!path.startsWith('/')) fail(at(`local reference ${ref} must start with / (pages live at different depths)`))
    if (path.endsWith('/')) {
      if (!['/', '/toolkit/', '/inbox/', '/inbox/demo/', ...BLOGS].includes(path)) fail(at(`link to an unknown page ${path}`))
      if (!hash) continue
      if (path === '/inbox/demo/') {
        const id = /^case=(.+)$/.exec(hash)?.[1]
        if (!id || !demoCases.has(id)) fail(at(`${ref}: no Case ${id} in the demo snapshot`))
      } else if (!idsOf(html[path]).includes(hash)) fail(at(`${ref}: #${hash} has no target on ${path}`))
    } else if (!existsSync(join(SITE, path))) fail(at(`missing file: ${path}`))
  }
  // the footer is the same everywhere
  footers.add(/<footer[\s\S]*<\/footer>/.exec(h)?.[0] ?? '')
  const text = plain(h)
  // readers reach the project through the form, so no address on any page; this file is public, so it names none either
  const decoded = decodeForScan(h)
  if (/mailto:/i.test(decoded)) fail(at('page has a mailto link'))
  for (const [email] of decoded.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) if (!email.endsWith('.example')) fail(at(`e-mail address on the page: ${email}`))
  for (const [re, what] of NO_CLAIMS) if (re.test(text)) fail(at(`page mentions ${what}`))
}
if (footers.size !== 1) fail('the footer differs between pages')
if (![...footers][0]?.includes(`<a href="${FEEDBACK_FORM}">Feedback</a>`)) fail('the footer has no Feedback link to the form')
{
  const headers = Object.entries(html).map(([url, h]) => [url, /<header class="nav"[\s\S]*?<\/header>/.exec(h)?.[0] ?? ''])
  if (new Set(headers.map(([, h]) => h.replace(/\s+aria-current="page"/g, ''))).size !== 1) fail('the global nav differs between pages (plan 14 R1)')
  for (const [url, h] of headers) {
    // every page of the blog marks Blog (plan 29), the other pages themselves
    const current = BLOGS.includes(url) ? BLOG_LIST : url
    const marked = [...h.matchAll(/<a\b[^>]*>/g)].filter((m) => /\saria-current=/.test(m[0])).map((m) => /\shref="([^"]+)"/.exec(m[0])?.[1] ?? '?')
    if (!marked.length || marked.some((m) => m !== current)) fail(`${url}: the global nav marks ${marked.join(', ') || 'nothing'} as the current page`)
    // every link to this page in the nav (the bar and the phone menu) carries the mark
    // (the brand links home on every page and is not a current-page link)
    for (const [tag] of h.matchAll(/<a\b[^>]*>/g))
      if (!/nav__brand/.test(tag) && /\shref="([^"]+)"/.exec(tag)?.[1] === current && !/\saria-current="page"/.test(tag))
        fail(`${url}: a nav link to this page lacks aria-current`)
  }
  for (const url of ['/toolkit/', '/inbox/']) {
    const sub = /<nav class="nav subnav"[^>]*data-subnav>[\s\S]*?<\/nav>/.exec(html[url])?.[0] ?? ''
    if (!sub || !/<body class="has-subnav">/.test(html[url])) fail(`${url}: no sub-nav (plan 14 R1)`)
    for (const [, a] of sub.matchAll(/href="#([^"]+)"/g)) if (!idsOf(html[url]).includes(a)) fail(`${url}: sub-nav link #${a} has no target`)
  }
  if (/data-subnav/.test(html['/'])) fail('/: the overview has no sub-nav')
}
const fromCss = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]).filter((u) => !/^(data:|#)/.test(u))
for (const f of fromCss) if (!existsSync(join(SITE, f))) fail(`styles.css: missing file ${f}`)

// app sentences, word for word (Toolkit src/config.ts, R-X-02 / R-X-03)
const config = read(join(TOOLKIT, 'src/config.ts'))
const sentence = (name) => new RegExp(`${name}\\s*=\\s*\\n?\\s*'([^']+)'`).exec(config)?.[1]
const PRIVACY = sentence('PRIVACY_TEXT')
const DISCLAIMER = sentence('DISCLAIMER_TEXT')
if (!PRIVACY || !DISCLAIMER) fail("cannot read PRIVACY_TEXT / DISCLAIMER_TEXT from the Toolkit's src/config.ts")
const footerText = plain([...footers][0] ?? '')
if (!footerText.includes(DISCLAIMER ?? '\0')) fail('footer does not carry DISCLAIMER_TEXT word for word')
if (!footerText.includes('Not affiliated with any platform')) fail('footer: "Not affiliated with any platform" missing')
if (!footerText.includes('Vegeta is open-source software, not a regulated service.')) fail('footer: the software statement (N28) is missing')
const privacyBody = plain(/<p class="privacy__body"[^>]*>([\s\S]*?)<\/p>/.exec(html['/toolkit/'])?.[1] ?? '').trim()
if (privacyBody !== PRIVACY) fail('/toolkit/: the privacy section does not carry PRIVACY_TEXT word for word')

// FAQ structure (handbook §4.5): every question has its own id with the page's prefix, a summary and its answer; numbers
// only from a short fixed list per page (counts and figures live in the trust sections, backed by release notes)
function faqOf(url, prefix, numbers, count, oneParagraph = true) {
  const faq = /<section class="faq"[\s\S]*?<\/section>/.exec(html[url])?.[0] ?? ''
  const answer = oneParagraph ? '<p>(?:(?!<\\/?p\\b)[\\s\\S])+<\\/p>' : '[\\s\\S]+?'
  const items = [
    ...faq.matchAll(new RegExp(`<details class="faq__item" id="(${prefix}-[a-z-]+)">\\s*<summary>[^<]+<\\/summary>\\s*${answer}\\s*<\\/details>`, 'g')),
  ]
  if (items.length < 1 || items.length !== (faq.match(/<details\b/g) ?? []).length)
    fail(`${url} FAQ: every <details> needs a ${prefix}-* id, a summary and one answer`)
  if (!/<a href="#faq">[^<]*FAQ<\/a>/.test(html[url]) && !(url === '/' && html[url].includes('<a href="/#faq">FAQ</a>'))) fail(`${url} FAQ: nav link missing`)
  if (items.length !== count) fail(`${url} FAQ: ${items.length} questions, the approved number is ${count}`)
  for (const [n] of plain(faq).matchAll(/\d[\d,.]*\d|\d/g)) if (!numbers.includes(n)) fail(`${url} FAQ: number ${n} is not allowed`)
  return faq
}

// ---- /toolkit/ (the accepted Toolkit page, moved from /) ----
{
  const faq = faqOf('/toolkit/', 'faq', ['3', '10', '2.0', '103'], 16)
  const dataAnswer = (/<details class="faq__item" id="faq-data">[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(faq)?.[1] ?? '').replace(/\s+/g, ' ')
  if (!dataAnswer.includes(PRIVACY ?? '\0')) fail('/toolkit/ FAQ: the data answer (#faq-data) does not carry PRIVACY_TEXT word for word')
  // a quoted phrase must be, whole, an on-screen app label (a string literal or JSX text in the app's .tsx files, not tests,
  // comments removed) or a CSV header alias in src/lib/csv.ts
  const tsx = (d) => walk(d).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
  const appSrc = tsx(join(TOOLKIT, 'src'))
    .map((f) => stripComments(read(f)))
    .join('\n')
  const csvSrc = stripComments(read(join(TOOLKIT, 'src/lib/csv.ts')))
  for (const [, q] of faq.matchAll(/&ldquo;([^&]+)&rdquo;/g)) {
    const literal = new RegExp(`(['"\`])${esc(q)}\\1`)
    const jsxText = new RegExp(`>\\s*${esc(q)}\\s*<`)
    if (!literal.test(appSrc) && !jsxText.test(appSrc) && !literal.test(csvSrc))
      fail(`/toolkit/ FAQ quotes "${q}", which is neither an app label nor a CSV header alias`)
  }
  // trust figures (P9): each must be backed by the release notes
  const notes = read(join(TOOLKIT, 'docs/RELEASE_NOTES.md'))
  const figures = [
    ['1,800', /agree with it on 1,800 generated cases/],
    ['267 / 267', /267 of 267 deliberate code breakages caught/],
    ['199 / 199', /all 199 test-plan cases due/],
  ]
  for (const [shown, backed] of figures) {
    if (!html['/toolkit/'].includes(`<dt>${shown}</dt>`)) fail(`/toolkit/ trust figure ${shown} not on the page as expected`)
    if (!backed.test(notes)) fail(`/toolkit/ trust figure ${shown} is not backed by the Toolkit's docs/RELEASE_NOTES.md`)
  }
}

// ---- / (overview) ----
{
  const faq = faqOf('/', 'dfaq', ['2.0'], 6)
  const data = (/<details class="faq__item" id="dfaq-data">[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(faq)?.[1] ?? '').replace(/\s+/g, ' ')
  if (!data.includes(PRIVACY ?? '\0')) fail('/ FAQ: the data answer (#dfaq-data) does not carry PRIVACY_TEXT word for word')
  if (/&ldquo;/.test(html['/'])) fail('/: no quoted UI text on the overview (quotes belong on the module pages, where they are checked)')
  if (/<dt>[^<]*\d/.test(html['/'])) fail('/: no figures on the overview (figures live on the module pages, backed by release notes)')
  // N29: an old link (/#faq-import) is sent on to /toolkit/, so the overview must not have such ids, and /toolkit/ must
  const OLD = /^(faq-[a-z-]+|step-[1-3]|how|trust|built)$/
  for (const id of idsOf(html['/'])) if (OLD.test(id)) fail(`/: id ${id} is an old Toolkit anchor that site.js forwards to /toolkit/`)
  // the accepted Toolkit page's ids (main @ 90f035c): every old link must still find its target
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
  for (const id of LEGACY) if (!idsOf(html['/toolkit/']).includes(id)) fail(`/toolkit/: old anchor #${id} missing`)
  if (!read('site-src/site.js').includes(String.raw`/^#(faq-[a-z-]+|step-[1-3]|how|trust|built)$/`))
    fail('site-src/site.js: the old-anchor list differs from the check')
}

// ---- /inbox/ ----
{
  const page = html['/inbox/']
  const text = plain(page)
  // K3 (P9): every figure on the page is backed by the Inbox release notes (CHANGELOG.md at inbox.ref)
  const allNotes = plain(inboxNotesRaw.replace(/\*\*/g, ''))
  const figures = Object.values(inboxTrust)
  const dts = [...page.matchAll(/<dt>([^<]*\d[^<]*)<\/dt>/g)].map((m) => m[1])
  if (dts.length !== figures.length || dts.some((d, i) => d !== figures[i])) fail(`/inbox/: trust figures differ from the measured v${inboxVersion} release`)
  const note = plain(/<p class="trust__note">([\s\S]*?)<\/p>/.exec(/<section class="trust"[\s\S]*?<\/section>/.exec(page)?.[0] ?? '')?.[1] ?? '')
  if (!note.includes(`v${inboxVersion} release checks`)) fail('/inbox/: trust note does not name the current release')
  if (inboxMeasuredVersion !== inboxVersion && !note.includes(`Measured on v${inboxMeasuredVersion}`))
    fail('/inbox/: trust note does not identify the measured release')
  for (const [n] of note.matchAll(/\d[\d,.]*\d|\d/g)) {
    const proof =
      n === inboxMeasuredVersion && inboxMeasuredVersion !== inboxVersion
        ? /measured on/
        : n === inboxVersion
          ? new RegExp(`^## v${esc(inboxVersion)}\\b`, 'm')
          : { 126: /held-out set of 126 emails/, 5.5: /Claude Opus 5\.5/ }[n]
    if (!proof?.test(currentInboxNotes)) fail(`/inbox/ trust note: ${n} is not backed by the current Inbox release`)
  }
  // N15: the problem section quotes figures from an external report; they were checked against the report itself
  // (UK Finance, Annual Fraud Report 2026, p. 42: invoice & mandate scam, value £41.3m, 68 per cent on non-personal
  // accounts), so only those figures may appear there, and only with the source line
  const problem = plain(/<section class="built built--top" id="problem"[\s\S]*?<\/section>/.exec(page)?.[0] ?? '')
  for (const [n] of problem.matchAll(/£?\d+(?:[.,]\d+)*(?:m|bn|%)?/g))
    if (!['01', '02', '03', '04', '£41.3m', '68%', '2025', '2026'].includes(n))
      fail(`/inbox/ problem section: figure ${n} is not one checked against the report`)
  if (!problem.includes('Fraud figures: UK Finance, Annual Fraud Report 2026 (figures for 2025), invoice and mandate scams.'))
    fail('/inbox/ problem section: the source line for the fraud figures is missing')
  // K5: the release notes' test-scope sentences for Microsoft 365 and Gmail, word for word, on the page
  for (const s of [
    'Microsoft 365 and Gmail push notifications (Pub/Sub) were tested only against simulated services.',
    'Gmail polling was tested on one personal Gmail account.',
  ]) {
    if (!allNotes.includes(s)) fail(`the Inbox CHANGELOG.md no longer says: ${s}`)
    if (!text.includes(s)) fail(`/inbox/ does not carry the release notes' sentence: ${s}`)
  }
  // and every sentence on the page about how a mailbox kind was tested is one of them
  for (const t of text.split(/(?<=\.)\s+/))
    if (/\btested\b/.test(t) && /Gmail|Microsoft 365|Pub\/Sub|IMAP/.test(t) && !allNotes.includes(t.trim()))
      fail(`/inbox/: "${t.trim()}" is not the release notes' wording`)
  // K4: a quoted phrase is, whole, Inbox on-screen text: a string literal or a JSX text run in src/web (not tests, comments
  // removed), or a value shown in the demo snapshot. "Whole" means the entire literal or text run, or one or more complete
  // sentences or lines of a snapshot value (a reply's body is quoted sentence by sentence), never a fragment of code.
  const inboxSrc = walk(join(INBOX, 'src/web'))
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
    .map((f) => stripComments(read(f)))
    .join('\n')
  const norm = (t) => t.replace(/\s+/g, ' ').trim()
  const literals = new Set([...inboxSrc.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)+)\1/g)].map((m) => norm(m[2].replace(/\\(.)/g, '$1'))))
  for (const [, run] of inboxSrc.matchAll(/[>}]([^<>{}]+)(?=[<{])/g)) literals.add(norm(run.replace(/^\s*[—–-]\s*/, '')))
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
      fail(`/inbox/ quotes "${q}", which is not whole Inbox UI text or demo data`)
  }
  // the hero panels repeat the review screen's words (the risk reasons, the checklist) and the demo's reply and email:
  // each must be whole on-screen text or a whole demo sentence; the email excerpt (ending in an ellipsis) a part of the
  // demo email (plan 14 R4)
  const e0225 = snapshot?.details?.E0225 ?? {}
  const byClass = (h, tag, cls) =>
    [...h.matchAll(new RegExp(`<${tag}\\b[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g'))].map((m) => m[1])
  const textOf = (frag) => norm(plain(frag).replace(/&hellip;|…/g, ''))
  const HERO = {
    '/': { reasons: 3, checks: 0, reply: 0, excerpt: 0 },
    '/inbox/': { reasons: 3, checks: 2, reply: 1, excerpt: 1 },
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
        fail(`${url} hero: "${q}" is not whole Inbox UI text or demo data`)
    for (const q of got.excerpt) if (!norm(e0225.text ?? '').includes(q)) fail(`${url} hero: the email excerpt is not part of the demo email E0225`)
  }
  // every use case links to its sample in the demo
  // a use case is reached by a link, so it has no entrance animation (handbook §10 item 12)
  if (/<li class="case"[^>]*data-reveal/.test(page)) fail('/inbox/: a use case has an entrance animation; links land on them')
  const caseItems = [...page.matchAll(/<li class="case" id="(case-[a-z]+)"[^>]*>([\s\S]*?)<\/li>/g)]
  if (caseItems.length !== 6) fail(`/inbox/: expected six use cases, found ${caseItems.length}`)
  for (const [, id, body] of caseItems) if (!/href="\/inbox\/demo\/#case=E\d{4}"/.test(body)) fail(`/inbox/ use case ${id} has no demo link`)
  // the category list matches the default configuration
  const cfgClasses = [...read(join(INBOX, 'config/default/cases.yaml')).matchAll(/\{ id: ([a-z_]+), risk_floor: ([a-z]+), queue: ([a-z_]+) \}/g)].map((m) =>
    m.slice(1).join(' '),
  )
  const pageClasses = [...page.matchAll(/<tr>\s*<td><code>([a-z_]+)<\/code><\/td>\s*<td>([a-z]+)<\/td>\s*<td><code>([a-z_]+)<\/code><\/td>\s*<\/tr>/g)].map(
    (m) => m.slice(1).join(' '),
  )
  if (cfgClasses.length < 1 || cfgClasses.join('|') !== pageClasses.join('|')) fail('/inbox/: the category table differs from config/default/cases.yaml')
  // FAQ: only the current release, Apache-2.0, MT103, pacs.008 and Microsoft 365 are numbers.
  faqOf('/inbox/', 'ifaq', [inboxVersion, inboxMeasuredVersion, '2.0', '103', '008', '365'], 14)
}

// ---- K3 for the whole text: every figure on / and /inbox/ is in an inventory with its source ----
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
  const toolkitScene = /<figure class="scene"[\s\S]*?<\/figure>/.exec(html['/toolkit/'])?.[0] ?? ''
  const numbering = ['01', '02', '03', '04', '05', '06', '1', '2', '3', '4']
  const names = {
    365: 'Microsoft 365',
    103: 'MT103',
    '008': 'pacs.008',
    '2.0': 'Apache-2.0',
    [inboxVersion]: 'the current release',
    [inboxMeasuredVersion]: 'the measured release',
  }
  // Each trust value is already parsed and validated against its current release metric above.
  const releaseFigureNumbers = new Set(Object.values(inboxTrust).flatMap((value) => value.split(' / ')))
  const INBOX_FIGURES = { 126: /held-out set of 126 emails/, 5.5: /Claude Opus 5\.5/ }
  for (const [n] of figures(html['/inbox/'])) {
    if (numbering.includes(n) || names[n]) continue
    if (['£41.3m', '68%', '2025', '2026'].includes(n)) continue // the problem section's report figures, checked above
    if (releaseFigureNumbers.has(n)) continue
    if (INBOX_FIGURES[n]) {
      if (!INBOX_FIGURES[n].test(currentInboxNotes)) fail(`/inbox/: figure ${n} is no longer in the Inbox CHANGELOG.md`)
      continue
    }
    if (n === '4893' && shownText.includes('"ending 4893"')) continue // demo sample E0225, as shown
    fail(`/inbox/: figure ${n} is not in the inventory of backed figures`)
  }
  const toolkitNotes = read(join(TOOLKIT, 'docs/RELEASE_NOTES.md'))
  const MODULE_PROOF = {
    toolkit: { figure: '1,800', release: '1.2.1', backed: () => /agree with it on 1,800 generated cases/.test(releaseSection(toolkitNotes, '1.2.1')) },
    inbox: {
      figure: inboxTrust.high,
      release: inboxVersion,
      backed: () => Boolean(inboxTrust.high),
    },
  }
  const modules = [...html['/'].matchAll(/<article class="module module--([a-z]+)"[^>]*>([\s\S]*?)<\/article>/g)]
  if (modules.map((m) => m[1]).join(',') !== 'toolkit,inbox') fail('/: expected the Toolkit and Inbox module columns')
  for (const [, mod, body] of modules) {
    const want = MODULE_PROOF[mod]
    const shown = /<span class="module__figure">([^<]+)<\/span>/.exec(body)?.[1]
    if (!want || shown !== want.figure) fail(`/: the ${mod} column shows ${shown}, not its backed figure ${want?.figure}`)
    else if (!want.backed()) fail(`/: the ${mod} figure ${shown} is not in its release notes' v${want.release} section`)
    if (want && !plain(body).includes(`v${want.release} release checks`)) fail(`/: the ${mod} column does not name release v${want?.release}`)
    if (mod === 'inbox' && inboxMeasuredVersion !== inboxVersion && !plain(body).includes(`measured on v${inboxMeasuredVersion}`))
      fail('/: Inbox module does not identify the measured release')
  }
  const withoutModules = modules.reduce((h, m) => h.replace(m[0], ''), html['/'])
  for (const [n] of figures(withoutModules)) {
    if (numbering.includes(n) || names[n]) continue
    // the Toolkit sample deal's figures in the hero panel: the same as the accepted /toolkit/ hero
    if (plain(toolkitScene).includes(n)) continue
    fail(`/: figure ${n} is not in the inventory of backed figures`)
  }
  const OWN = { toolkit: ['1,800', '1.2.1'], inbox: [...inboxTrust.high.split(' / '), inboxVersion, inboxMeasuredVersion] }
  for (const [, mod, body] of modules)
    for (const [n] of figures(body))
      if (!numbering.includes(n) && !(OWN[mod] ?? []).includes(n)) fail(`/: figure ${n} in the ${mod} column is not that module's figure`)
  for (const url of ['/', '/inbox/'])
    for (const [m] of plain(html[url]).matchAll(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|fifty|hundred)\s+(years?|months?|weeks?|days?|hours?|minutes?|per ?cent|times)\b/gi,
    ))
      fail(`${url}: "${m}" is a figure written out; figures need a backed number`)
}

// ---- K7, K8: /inbox/demo/ is exactly the locked package ----
{
  const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
  const lock = JSON.parse(read('inbox-demo.lock'))
  const ref = read('inbox.ref').trim()
  if (lock.commit !== ref) fail(`inbox-demo.lock is for ${lock.commit}, inbox.ref is ${ref}`)
  const files = walk(DEMO)
    .map((f) => relative(DEMO, f))
    .sort()
  const want = [...Object.keys(lock.files), 'MANIFEST.sha256'].sort()
  for (const e of readdirSync(join(SITE, 'inbox'))) if (e.startsWith('.')) fail(`site/inbox/${e}: a hidden file or directory would be published`)
  if (files.join('|') !== want.join('|')) fail(`/inbox/demo/: files differ from inbox-demo.lock (${files.length} vs ${want.length})`)
  for (const [f, h] of Object.entries(lock.files))
    if (existsSync(join(DEMO, f)) && sha(join(DEMO, f)) !== h) fail(`/inbox/demo/${f} differs from inbox-demo.lock`)
  if (existsSync(join(DEMO, 'MANIFEST.sha256')) && sha(join(DEMO, 'MANIFEST.sha256')) !== lock.manifest_sha256)
    fail('/inbox/demo/MANIFEST.sha256 differs from inbox-demo.lock')
  const info = JSON.parse(read(join(DEMO, 'snapshot-info.json')))
  if (info.commit !== ref || info.version !== lock.version) fail('/inbox/demo/snapshot-info.json does not match inbox.ref and the lock')
  const index = read(join(DEMO, 'index.html'))
  if (!/<meta name="robots" content="noindex"/.test(index)) fail('/inbox/demo/: index.html has no noindex')
  for (const [, attrs, body] of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))
    if (body.trim() || !/\bsrc="\.\/[^"]+"/.test(attrs)) fail('/inbox/demo/: a script that is inline or not from the demo directory')
  if (/<style\b|\sstyle\s*=|\son[a-z]+\s*=/i.test(index)) fail('/inbox/demo/: inline style or event handler in index.html')
  const snap = read(join(DEMO, 'data/snapshot.js'))
  for (const [email] of snap.matchAll(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g))
    if (!/\.example$/.test(email)) fail(`/inbox/demo/ snapshot: e-mail address ${email} is not .example`)
  for (const [re, what] of [
    [/Bearer\s+[\w-]/, 'a bearer token'],
    [/sk-ant-|-----BEGIN [A-Z ]*PRIVATE KEY/, 'a key'],
    [/"csrf":"[^"]/, 'a CSRF token'],
    [/"(password|passwordHash|secret|token)":"[^"]/i, 'a credential'],
    ...PRIVATE_TERMS,
  ])
    if (re.test(snap)) fail(`/inbox/demo/ snapshot contains ${what}`)
}

// the served script is the current build, and small
const dir = mkdtempSync(join(tmpdir(), 'site-check-'))
try {
  execFileSync('npx', ['--no-install', 'rolldown', 'site-src/site.js', '-f', 'iife', '-m', '-o', join(dir, 'site.js')], { stdio: 'pipe' })
  if (read(join(dir, 'site.js')) !== read(join(SITE, 'site.js'))) fail('site/site.js is not the current build of site-src/site.js (run npm run site:build)')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
const gz = gzipSync(readFileSync(join(SITE, 'site.js'))).length
if (gz > 6144) fail(`site/site.js is ${gz} bytes gzip, over 6 KB`)

// R14: step cards are set in type; obsolete video assets must not return. Allowed: the closing section's loop, the film, the blog's figure loops.
const BLOG_LOOPS = ['reconciliation', 'closing', 'exit', 'inbox', 'verification']
const ALLOWED_CLIPS = [
  join('img', 'valley-loop.mp4'),
  join('media', 'goten-film.mp4'),
  join('media', 'trunks-film.mp4'),
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
    const film = `<figure class="article__media"> ?<video data-film controls playsinline preload="none" width="864" height="1080" poster="/media/blog/edu/${a.slug}\\.webp" aria-label="[^"]{20,}" ?> ?<source src="/media/blog/edu/${a.slug}-film\\.mp4" type="video/mp4" ?/> ?<track kind="captions" src="/media/blog/edu/${a.slug}-film\\.vtt" srclang="en" label="English" ?/> ?</video> ?</figure>`
    if (!new RegExp(a.hero.film ? film : figure).test(body)) fail(`${url}: its figure is missing or broken`)
    for (const n of figuresOf(a)) {
      const inner = `<figure class="article__media article__media--wide"> ?<video data-ambient muted loop playsinline preload="none" width="904" height="702" tabindex="-1" poster="/media/blog/edu/${n}\\.webp" aria-label="[^"]{20,}" ?> ?<source src="/media/blog/edu/${n}\\.mp4" type="video/mp4" ?/> ?</video> ?</figure>`
      if (!new RegExp(inner).test(body)) fail(`${url}: figure ${n} is missing or broken`)
    }
    if (
      !body.includes(`<p class="article__date"> Updated ${EDUCATION.updated} </p>`) &&
      !body.includes(`<p class="article__date">Updated ${EDUCATION.updated}</p>`)
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
  const example = computeExample(TOOLKIT, INBOX)
  if (JSON.stringify(stored) !== JSON.stringify(example))
    fail('blog: site-src/blog-example.json is not what the pinned code computes (node scripts/blog-example.mjs --write)')
  const { goten: g } = example

  // every figure file is bound to this example and these releases
  const manifest = JSON.parse(read('site-src/blog-figures.json'))
  const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
  if (manifest.example !== sha('site-src/blog-example.json')) fail('blog: the figures were rendered from a different example (scripts/render-blog-figures.py)')
  if (manifest.toolkitRef !== read('toolkit.ref').trim() || manifest.inboxRef !== read('inbox.ref').trim())
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
    const seenFigures = [...body.matchAll(/\/media\/blog\/([a-z]+)\.(?:webp|mp4)/g)].map((m) => m[1])
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
    if (!/\bcontrols\b/.test(video) || !/preload="none"/.test(video) || /\bautoplay\b/.test(video))
      fail(`${url}: the film must have controls, preload none, no autoplay`)
    if (!/\baria-label="[^"]+"/.test(video)) fail(`${url}: the film has no accessible name`)
    if (!video.includes(`poster="/media/${film}-film-poster.jpg"`)) fail(`${url}: the film has the wrong poster`)
    if (!body.includes(`<source src="/media/${film}-film.mp4" type="video/mp4"`)) fail(`${url}: the article plays the wrong film`)
    if (!body.includes(`<track kind="captions" src="/media/${film}-film.vtt"`)) fail(`${url}: the film has no captions`)
    // what readers see is held to the same lists
    const seen = [
      text,
      /<title>([^<]*)<\/title>/.exec(page)?.[1] ?? '',
      ...[...body.matchAll(/\b(?:alt|aria-label)="([^"]*)"/g)].map((m) => m[1]),
      ...['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].map((key) => metaOf(key) ?? ''),
    ].join(' \n ')
    const allowed = new Set([...numbers, '7', '2026']) // the update date
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
  const gotenText = article(BLOG_GOTEN, {
    title: 'The money work on an SPV, ready for a person to check',
    summary:
      'Much of the money work on an SPV still happens by hand. What Goten prepares at each step, from bank statement to exit, and what a person still decides.',
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
      'one investment and one exit, with the same terms for every investor',
      'Your deal data is processed in your browser and never sent by this app',
    ],
  })
  if (/fictional/i.test(gotenText)) fail(`${BLOG_GOTEN}: says fictional`)

  // Trunks: every figure and quoted reply is held to the release notes and the default templates at inbox.ref
  const templates = read(join(INBOX, 'config/default/templates.yaml'))
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
  if (!/held-out set of 126 emails/.test(currentInboxNotes)) fail('blog: 126 is not in the Trunks release notes')
  if (!/in both blind sets the qualifying samples were pacs\.008/.test(currentInboxNotes))
    fail('blog: the pacs.008 coverage note is not in the Trunks release notes')
  if (!read(join(INBOX, 'docs/en/security-model.md')).includes('default 24 hours')) fail('blog: 24 hours is not the Trunks default')
  article(BLOG_TRUNKS, {
    title: 'Every investor email, ready for a person',
    summary:
      'Much of the work of running an SPV or syndicate still happens by hand, in a shared mailbox. What Trunks prepares for each kind of email, and what a person still decides.',
    film: 'trunks',
    numbers: `10,000.00 001 20,000.00 005 24 126 5.5 18 123 125 103 008 9 ${inboxVersion}`.split(' '),
    figures: {
      inbox: 'Trunks inbox with four investor emails. The first, Did my payment arrive? from Son Goku, is selected.',
      reply:
        'Trunks reply to Son Goku, from the ledger: We have received GBP 10,000.00 for Senzu Labs (reference SEN-001). Your commitment of GBP 10,000.00 is paid in full. Approved, with a button to copy the text.',
      verification:
        'Trunks verification for a change of bank account, rated high risk with a look-alike domain: call the number on file, cooling-off of 24 hours by default, then approval by a second person, still waiting.',
      evidence:
        "Trunks payment confirmation from Yamcha: GBP 20,000.00, reference SEN-005, with its value date and UETR. Not in your ledger yet: the sender's confirmation, not proof of receipt.",
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
      'Nothing stops someone closing a case with its task open',
      'a taken-over mailbox would pass',
      'One run with one model, Claude Opus 5.5, on 126 fictional emails that development never read',
      `measured on v${inboxMeasuredVersion}`,
      'rated high in 18 of 18',
      'linked correctly in 123 of 125',
      'were all pacs.008',
      `Trunks v${inboxVersion} runs on your own server with Docker`,
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
  const sitemapPages = ['/', '/toolkit/', '/inbox/', BLOG_LIST, ...BLOG_TOPICS, BLOG_GOTEN, BLOG_TRUNKS, ...EDU_URLS]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPages.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`
  if (!existsSync(join(SITE, 'sitemap.xml')) || read(join(SITE, 'sitemap.xml')) !== sitemap) fail('sitemap.xml is not exactly the list of pages')
  if (!existsSync(join(SITE, 'robots.txt')) || read(join(SITE, 'robots.txt')) !== `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`)
    fail('robots.txt is not the expected file')
  if (JSON.stringify([...sitemapPages].sort()) !== JSON.stringify(Object.keys(html).sort())) fail('the sitemap list and the checked pages differ')
  const feat = EDUCATION.featured
  const flatList = listBody.replace(/\s+/g, ' ')
  const featured = `<a class="blogfeature" href="${feat.href}" ?> ?<img src="${feat.card}"[^>]*> ?<span ?> ?<small ?>${feat.tag}</small ?> ?<strong ?>${feat.title} ?</strong ?> ?<em ?> ?${feat.summary} ?</em ?> ?</span ?> ?</a ?>`
  if (feat.href !== BLOG_GOTEN || !new RegExp(featured).test(flatList)) fail(`${BLOG_LIST}: the featured article is wrong`)
  if (!html[BLOG_GOTEN].replace(/\s+/g, ' ').includes(`<p class="article__date">Updated ${EDUCATION.updated}</p>`)) fail(`${BLOG_GOTEN}: no update date`)
  for (const [url, picture] of [
    [BLOG_GOTEN, 'goten-share.jpg'],
    [BLOG_TRUNKS, 'trunks-share.jpg'],
  ])
    if (
      !html[url].includes(`<meta property="og:image" content="https://vegeta-ops.vercel.app/media/${picture}" />`) ||
      !existsSync(join(SITE, 'media', picture))
    )
      fail(`${url}: not its own share picture`)
  if (!(html['/'].match(/<a href="\/blog\/">Blog<\/a>/g) ?? []).length) fail('/: the footer has no Blog link')

  // the films and their captions: real files, in order, inside the film, placed clear of the film's own text, and scanned like a page.
  // Every block is read, so a malformed one fails instead of dropping out of the count. line:3% is the top of the picture: the film's text sits low
  if (existsSync(join(SITE, 'media', 'vegeta-film.mp4'))) fail('blog: the whole film is not on the site (plan 22)')
  for (const [film, seconds, count] of [
    ['goten', 36, 9],
    ['trunks', 40, 15],
  ]) {
    if (statSync(join(SITE, 'media', `${film}-film.mp4`)).size > 8e6) fail(`blog: the ${film} film is over 8 MB`)
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
    if (/invited|calls that matter/i.test(vtt)) fail(`blog: ${film} captions carry the film's ending`)
  }
}

// headers (K9: one rule for the whole site, unchanged)
const vercel = JSON.parse(read(join(SITE, 'vercel.json')))
if (vercel.headers.length !== 1 || vercel.headers[0].source !== '/(.*)') fail('vercel.json: expected one header rule for the whole site')
const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
// the demo uses relative paths: /inbox/demo without the slash must redirect, or its files would resolve one level up
for (const r of ['/toolkit', '/inbox', '/inbox/demo', ...BLOGS.map((url) => url.slice(0, -1))])
  if (!(vercel.redirects ?? []).some((x) => x.source === r && x.destination === r + '/')) fail(`vercel.json: no redirect from ${r} to ${r}/`)
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'"
if (csp !== CSP) fail(`CSP is not the approved policy: ${csp}`)

if (problems.length) {
  console.error(`site check: ${problems.length} problem(s)\n- ` + problems.join('\n- '))
  process.exit(1)
}
console.log(
  `site check: OK (${Object.keys(PAGES).length} pages, demo v${JSON.parse(read('inbox-demo.lock')).version} locked, 7 source-checked illustrations, script ${gz} bytes gzip)`,
)
