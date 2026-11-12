// Plan 30: builds /docs/ from each product's Markdown in its public repo at the docs pin in site-src/docs.json (separate from
// goten.ref and trunks.ref). Pages are committed; Vercel does not build.
// Usage: npm run docs:fetch, node scripts/build-docs.mjs, then prettier on site/docs/**/*.html (never on the .md files, which
// check-site compares byte for byte). A page exists only for a sidebar item with a route.
// Plan 31: every page also has its Markdown at the route without the trailing slash plus .md, and /llms.txt lists them.
// check-site imports renderDocs() and compares its output with the committed pages, so both use this one renderer.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Marked } from 'marked'

const SITE_URL = 'https://vegeta-ops.vercel.app'
const SHARE_ALT = 'Vegeta — SPV and syndicate operations software. Goten: Deal Calculations. Trunks: Operations Inbox.'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page({ header, footer }, title, summary, path, body, markdown) {
  const full = esc(`${title} | Vegeta`)
  // straight double quotes become curly ones, so prettier keeps every attribute value double-quoted (check-site requires it)
  const d = esc(summary.replace(/"([^"]*)"/g, '\u201c$1\u201d'))
  const url = SITE_URL + path
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>${full}</title>
    <meta name="description" content="${d}" />
    <meta property="og:site_name" content="Vegeta" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${full}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE_URL}/img/vegeta-share.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(SHARE_ALT)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${full}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${SITE_URL}/img/vegeta-share.jpg" />
    <meta name="twitter:image:alt" content="${esc(SHARE_ALT)}" />
    <link rel="canonical" href="${url}" />${markdown ? `\n    <link rel="alternate" type="text/markdown" href="${markdown}" />` : ''}
    <link rel="icon" href="/favicon-v.svg" type="image/svg+xml" />
    <link rel="preload" href="/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/docs.css" />
    <script src="/site.js"></script>
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>

    ${header}

    <main id="main">
${body}
    </main>

    ${footer}
  </body>
</html>
`
}

// the public repo's checkout from npm run docs:fetch, exactly at the pin; the version shown must be released at that commit
export function checkoutOf(product) {
  const dir = `vendor/docs/${product.id}`
  const git = (...a) =>
    execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' })
      .toString()
      .trim()
  if (!existsSync(`${dir}/.git`) || git('rev-parse', 'HEAD') !== product.source.ref || git('status', '--porcelain'))
    throw new Error(`${dir} is not a clean checkout of ${product.source.ref.slice(0, 7)} (run npm run docs:fetch)`)
  const notes = readFileSync(join(dir, product.source.notes), 'utf8')
  if (!new RegExp(`^## ${product.version.replace(/\./g, '\\.')} `, 'm').test(notes))
    throw new Error(`${product.name} ${product.version} is not in its release notes (${product.source.notes})`)
  return dir
}
// where a page's Markdown is served: /docs/trunks/build/quickstart/ -> /docs/trunks/build/quickstart.md
export const markdownPath = (route) => route.slice(0, -1) + '.md'
const plainText = (s) => s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '')
const slug = (s) =>
  plainText(s)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')

function render(md, file, routes, product, dir, outside, pageAnchors, mdLinks = new Map()) {
  const ids = new Set()
  const anchors = []
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth, text }) {
        let id = slug(text)
        for (let n = 1; ids.has(id); n++) id = `${slug(text)}-${n}`
        ids.add(id)
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}<a class="docs__anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`
      },
      // a link is kept only if it leads somewhere on the site or the web; a page not built yet stays as its text
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens)
        // an address on the reader's own machine or a placeholder host (bare URLs in the text become links) stays as its text
        if (/^https?:\/\/(127\.0\.0\.1|localhost|[^/:]*\.example)([/:]|$)|^https?:\/\/?$|^https?:\/\/</.test(href)) return text
        if (/^https?:/.test(href)) return `<a href="${esc(href)}">${text}</a>`
        // the site carries no mailto links (sample addresses in a CSV stay as text)
        if (href.startsWith('mailto:')) return text
        if (href.startsWith('#')) {
          anchors.push(href.slice(1))
          return `<a href="${esc(href)}">${text}</a>`
        }
        const [path, hash] = href.split('#')
        const target = posix.normalize(posix.join(posix.dirname(file), path))
        const route = routes.get(target)
        if (route) {
          if (hash) pageAnchors.push([file, route, hash])
          mdLinks.set(href, SITE_URL + markdownPath(route) + (hash ? `#${hash}` : ''))
          return `<a href="${route}${hash ? `#${esc(hash)}` : ''}">${text}</a>`
        }
        // a repo file that is not a page opens on GitHub at the pinned commit; anything else stays as its text
        const published = !target.startsWith('..') && existsSync(join(dir, target))
        outside.push(`${file}: ${href} -> ${published ? 'GitHub' : 'text only'}`)
        if (!published) {
          mdLinks.set(href, null)
          return text
        }
        mdLinks.set(href, `${product.source.repo}/blob/${product.source.ref}/${target}${hash ? `#${hash}` : ''}`)
        return `<a href="${product.source.repo}/blob/${product.source.ref}/${target}${hash ? `#${esc(hash)}` : ''}">${text}</a>`
      },
      code({ text }) {
        return `<pre tabindex="0"><code>${esc(text)}</code></pre>\n`
      },
      // raw HTML shows as text, so no document can bring a script, a style or an event attribute past the CSP rules
      html({ text }) {
        return esc(text)
      },
      image({ text }) {
        return esc(text)
      },
    },
  })
  const tokens = marked.lexer(md)
  const at = tokens.findIndex((t) => t.type === 'heading' && t.depth === 1)
  if (at < 0) throw new Error(`${file}: no title`)
  const [title] = tokens.splice(at, 1)
  const first = tokens.find((t) => t.type === 'paragraph')
  if (!first) throw new Error(`${file}: no opening paragraph`)
  const html = marked
    .parser(tokens)
    .replace(/<table>/g, '<div class="docs__table" tabindex="0"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/ align="(left|right|center)"/g, '')
  for (const a of anchors) if (!ids.has(a)) throw new Error(`${file}: no heading for #${a}`)
  return { title: plainText(title.text), summary: plainText(first.text), html }
}

// the page's Markdown as the product repo has it, with a source line under the title; a link to another docs page
// points at that page's Markdown, a link to another repo file at GitHub (the pinned commit), a link to nothing published
// becomes its text, so the raw files link to the same places as the pages (plan 31)
function markdownOf(md, mdLinks, product, source) {
  const body = md.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (all, bang, text, href, title = '') => {
    if (bang || !mdLinks.has(href)) return all
    const to = mdLinks.get(href)
    return to === null ? text : `[${text}](${to}${title})`
  })
  const line = `> ${product.name} ${product.version}. Source: ${product.source.repo}/blob/${product.source.ref}/${source}`
  const at = body.search(/^# .*$/m)
  const end = body.indexOf('\n', at)
  return `${body.slice(0, end)}\n\n${line}${body.slice(end)}`
}

export const CHANGELOG = '/changelog/'
export const NOT_FOUND = '/404.html'
// every release in a notes file, newest first as written: "## v1.3.1 — 2026-11-10", "## v1.2.1 — released 2026-10-28",
// "## v0.4.0 (2026-11-10): closing rules and two-person checks". The line is the title after the colon, or else the first
// sentence of the first paragraph that is not the "Live at ..." deployment line, without its closing reference in brackets.
export function releasesOf(notes) {
  const out = []
  const sections = notes.split(/^## /m).slice(1)
  for (const section of sections) {
    const head = section.slice(0, section.indexOf('\n'))
    const m = /^(v\d+\.\d+\.\d+)\s*(?:—\s*(?:released\s+)?(\d{4}-\d{2}-\d{2})|\((\d{4}-\d{2}-\d{2})\)(?::\s*(.+))?)\s*$/.exec(head)
    if (!m) throw new Error(`release notes: cannot read the heading "## ${head}"`)
    let line = m[4]
    if (!line) {
      const para = section
        .slice(head.length)
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .find((s) => s && !/^(#|[-*] |Live at )/.test(s))
      if (!para) throw new Error(`release notes: ${m[1]} has no opening paragraph`)
      line = plainText(para.replace(/\s+/g, ' '))
        .split(/(?<=[.!?])\s/)[0]
        .replace(/\s*\([^()]*\)(?=[.!?]?$)/, '')
    }
    out.push({ version: m[1], date: m[2] ?? m[3], line: plainText(line), id: slug(head) })
  }
  return out
}

// plan 36 §11 F3c: on a release notes page, the current item lists each release, linked to its heading
function sidebar(product, current, releases = []) {
  const sub = releases.length
    ? `<ul class="docs__sub">\n${releases.map((r) => `              <li><a href="#${r.id}">${esc(r.version)} <span>${esc(r.date)}</span></a></li>`).join('\n')}\n            </ul>`
    : ''
  return product.groups
    .map(
      (g) => `<p class="docs__group">${esc(g.label)}</p>
          <ul>
${g.items
  .map((i) => {
    if (!i.route) return `            <li><span>${esc(i.title)}</span></li>`
    if (i.route === current) return `            <li><a href="${i.route}" aria-current="page">${esc(i.title)}</a>${sub}</li>`
    return `            <li><a href="${i.route}">${esc(i.title)}</a></li>`
  })
  .join('\n')}
          </ul>`,
    )
    .join('\n          ')
}

// every docs page as [route, html] (before prettier), and the links that are not docs pages
export function renderDocs() {
  const spec = JSON.parse(readFileSync('site-src/docs.json', 'utf8'))
  const shell = readFileSync('site/blog/index.html', 'utf8')
  // the shared nav, with Docs marked as the current page in the bar and in the phone menu
  const header = /<header class="nav"[\s\S]*?<\/header>/
    .exec(shell)[0]
    .replace(/ aria-current="page"/g, '')
    .replace(/<a href="\/docs\/">/g, '<a href="/docs/" aria-current="page">')
  if ((header.match(/aria-current/g) ?? []).length !== 2) throw new Error('the shared nav needs a Docs link in the bar and in the menu')
  const chrome = { header, footer: /<footer class="footer"[\s\S]*?<\/footer>/.exec(shell)[0] }
  const pages = []
  const write = (route, html) => pages.push([route, html])
  // links the site does not publish as a page, kept only where the target is a file in the public repo at the pin
  const outside = []
  // links to a section of another docs page, checked once every page is built
  const pageAnchors = []
  const idsByRoute = new Map()
  // [path, text] of each page's Markdown, and the /llms.txt index of them
  const markdown = []
  const llms = []
  for (const product of spec.products) {
    const items = product.groups.flatMap((g) => g.items).filter((i) => i.route)
    if (!items.length) continue
    const dir = checkoutOf(product)
    const routes = new Map(items.map((i) => [i.source, i.route]))
    for (const item of items) {
      const source = readFileSync(join(dir, item.source), 'utf8')
      const mdLinks = new Map()
      const { title, summary, html } = render(source, item.source, routes, product, dir, outside, pageAnchors, mdLinks)
      markdown.push([markdownPath(item.route), markdownOf(source, mdLinks, product, item.source)])
      idsByRoute.set(item.route, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])))
      const links = sidebar(product, item.route, item.source === product.source.notes ? releasesOf(source) : [])
      const label = esc(`${product.name} docs`)
      write(
        item.route,
        page(
          chrome,
          title,
          summary,
          item.route,
          `      <div class="docs">
        <nav class="docs__side" aria-label="${label}">
          ${links}
        </nav>
        <div class="docs__main">
          <details class="docs__menu">
            <summary>${label}</summary>
            <nav aria-label="${label}">
          ${links}
            </nav>
          </details>
          <p class="docs__kicker"><a href="${items[0].route}"${item === items[0] ? ' aria-current="page"' : ''}>${esc(product.name)}</a></p>
          <h1 class="docs__title">${esc(title)}</h1>
          <p class="docs__version">${esc(product.version)}</p>
          <div class="docs__body">
${html}
          </div>
        </div>
      </div>`,
          markdownPath(item.route),
        ),
      )
    }
    for (const group of product.groups) {
      const listed = group.items.filter((i) => i.route)
      if (!listed.length) continue
      llms.push(`\n## ${product.name} ${product.version}: ${group.label}\n`)
      for (const item of listed) llms.push(`- [${item.title}](${SITE_URL}${markdownPath(item.route)})`)
    }
  }

  for (const [file, route, hash] of pageAnchors) if (!idsByRoute.get(route)?.has(hash)) throw new Error(`${file}: no heading for ${route}#${hash}`)

  // each card is the one way into a module's docs; inside it, the names of the sidebar groups say what the docs hold
  const cards = spec.products
    .map((p) => {
      const groups = p.groups.filter((g) => g.items.some((i) => i.route)).map((g) => esc(g.label))
      const inner = `<strong>${esc(p.name)}</strong><span>${esc(p.role)}</span><span class="docs-card__groups">${groups.join(' · ')}</span><small>${esc(p.version)}</small>`
      const home = p.groups.flatMap((g) => g.items).find((i) => i.route)
      return home ? `          <a class="docs-card" href="${home.route}">${inner}</a>` : `          <div class="docs-card docs-card--off">${inner}</div>`
    })
    .join('\n')
  write(
    '/docs/',
    page(
      chrome,
      spec.title,
      spec.line,
      '/docs/',
      `      <div class="blogindex__intro">
        <p class="eyebrow section-label">Docs</p>
        <h1 class="blogindex__title">${esc(spec.heading)}</h1>
      </div>
      <div class="docs-index">
        <div class="docs-index__cards">
${cards}
        </div>
      </div>`,
    ),
  )
  // plan 36 C1, §12.3: /changelog/ is one timeline of every release of every module, newest first, from each module's
  // release notes at the docs pin; each row leads to that release on the module's Release notes page. Nothing is written
  // here: the line is the release's own title, or the first sentence of its notes.
  const releases = []
  const notesLinks = []
  const licences = []
  for (const p of spec.products) {
    const item = p.groups.flatMap((g) => g.items).find((i) => i.route && i.source === p.source.notes)
    if (!item) throw new Error(`${p.name}: docs.json has no page for its release notes (${p.source.notes})`)
    const list = releasesOf(readFileSync(join(checkoutOf(p), p.source.notes), 'utf8'))
    if (list[0]?.version !== p.version) throw new Error(`${p.name}: the newest release in its notes is not ${p.version}`)
    list.forEach((r, k) => {
      if (!idsByRoute.get(item.route).has(r.id)) throw new Error(`${item.route}: no heading #${r.id}`)
      releases.push({ ...r, product: p, href: `${item.route}#${r.id}`, k })
    })
    notesLinks.push(`<a href="${item.route}">${esc(p.name)} release notes <span class="arrow" aria-hidden="true">→</span></a>`)
    licences.push(`<a href="${p.source.repo}/blob/${p.source.ref}/LICENSE">${esc(p.name)} licence <span class="arrow" aria-hidden="true">→</span></a>`)
  }
  // newest date first; on the same date each module keeps the order of its notes, and modules the order of docs.json
  const order = new Map(spec.products.map((p, n) => [p.id, n]))
  releases.sort((a, b) => b.date.localeCompare(a.date) || order.get(a.product.id) - order.get(b.product.id) || a.k - b.k)
  const rows = releases.map(
    (r) =>
      `            <li><a href="${r.href}"><time datetime="${r.date}">${r.date}</time><span class="changelog__mod changelog__mod--${r.product.id}">${esc(r.product.name)}</span><strong>${esc(r.version)}</strong><span>${esc(r.line)}</span></a></li>`,
  )
  const columns = `          <p class="changelog__meta"><span>${notesLinks.join(' ')}</span><span>Apache-2.0 ${licences.join(' ')}</span></p>
          <ol class="changelog__list">
${rows.join('\n')}
          </ol>`
  write(
    CHANGELOG,
    page(
      chrome,
      // the page's own title differs from the Trunks notes page, whose document title is also "Changelog"
      spec.changelog.pageTitle,
      spec.changelog.line,
      CHANGELOG,
      `      <div class="blogindex__intro">
        <p class="eyebrow section-label">${esc(spec.changelog.title)}</p>
        <h1 class="blogindex__title">${esc(spec.changelog.heading)}</h1>
        <p class="blogindex__lede">${esc(spec.changelog.lede)}</p>
      </div>
      <div class="docs-index">
        <div class="changelog">
${columns}
        </div>
      </div>`,
    ),
  )
  // plan 36 D7: what Vercel serves for an address that does not exist (site/404.html): the same page frame, no page marked
  // in the nav, not indexed, three ways on
  const notFound = page(
    { header: header.replace(/ aria-current="page"/g, ''), footer: chrome.footer },
    'Page not found',
    'This address is not a page on this site.',
    NOT_FOUND,
    `      <div class="blogindex__intro">
        <p class="eyebrow section-label">Not found</p>
        <h1 class="blogindex__title">This address is not a page.</h1>
        <ul class="notfound">
          <li><a href="/">Overview</a></li>
          <li><a href="/docs/">Docs</a></li>
          <li><a href="/blog/">Blog</a></li>
        </ul>
      </div>`,
  )
    .replace(/\n    <link rel="canonical" href="[^"]*" \/>/, '')
    .replace(/\n    <meta property="og:url" content="[^"]*" \/>/, '')
    .replace(
      '<meta name="color-scheme" content="light dark" />',
      '<meta name="color-scheme" content="light dark" />\n    <meta name="robots" content="noindex" />',
    )
  const text = `# Vegeta\n\n> ${spec.llms}\n${llms.join('\n')}\n`
  return { pages, outside, markdown, llms: text, notFound }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { pages, outside, markdown, llms, notFound } = renderDocs()
  writeFileSync(join('site', NOT_FOUND), notFound)
  for (const [route, html] of pages) {
    const file = join('site', route, 'index.html')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, html)
  }
  for (const [path, text] of markdown) writeFileSync(join('site', path), text)
  writeFileSync('site/llms.txt', llms)
  const built = pages.map(([route]) => route)

  // the sitemap lists the docs pages last, the index first (scripts/build-education.mjs writes the same list)
  const sitemap = readFileSync('site/sitemap.xml', 'utf8').replace(/  <url><loc>[^<]*\/(docs\/[^<]*|changelog\/)<\/loc><\/url>\n/g, '')
  const docsUrls = ['/docs/', ...built.filter((r) => r !== '/docs/')].map((r) => `  <url><loc>${SITE_URL}${r}</loc></url>\n`).join('')
  writeFileSync('site/sitemap.xml', sitemap.replace('</urlset>', docsUrls + '</urlset>'))

  // each page has the same trailing-slash redirect as every other page
  const vercel = JSON.parse(readFileSync('site/vercel.json', 'utf8'))
  for (const route of built) {
    const source = route.slice(0, -1)
    if (!vercel.redirects.some((r) => r.source === source)) vercel.redirects.push({ source, destination: route, permanent: true })
  }
  writeFileSync('site/vercel.json', JSON.stringify(vercel, null, 2) + '\n')
  console.log(`${built.length} docs pages built`)
  for (const l of outside) console.log(`  not a docs page: ${l}`)
}
