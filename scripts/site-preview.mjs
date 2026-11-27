// Serves site/ locally with the headers from site/vercel.json, so checks see the production CSP (site handbook §6).
// Usage: node scripts/site-preview.mjs [port]
import { createServer } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const ROOT = 'site'
const PORT = Number(process.argv[2] ?? 4181)
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
const headers = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]))
// the pages' own redirects (/inbox → /trunks/), so the demo's relative paths resolve as in production
const redirects = new Map((vercel.redirects ?? []).map((r) => [r.source, r.destination]))
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
}

// plan 44: /api/explore runs the real function. By default with its local stand-in (no Redis, no model, no cost);
// EXPLORE_MOCK=0 with the settings in your shell runs it for real. Nothing else under /api/ is served, as on Vercel.
process.env.EXPLORE_MOCK ??= '1'
process.env.EXPLORE_ORIGINS = [process.env.EXPLORE_ORIGINS, `http://localhost:${PORT}`].filter(Boolean).join(',')
const explore = import('../site/api/explore.mjs')
async function api(req, res) {
  const remote = req.socket.remoteAddress ?? '127.0.0.1'
  const chunks = []
  let size = 0
  // read it all (keeping at most 64 KB) so the socket stays open; the function applies its own 2 KB cap
  for await (const c of req) {
    size += c.length
    if (size <= 65536) chunks.push(c)
  }
  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]])),
    body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
  })
  request.headers.set('x-vercel-forwarded-for', remote)
  const { POST, GET } = await explore
  const r = await (req.method === 'POST' ? POST(request) : GET(request))
  res.writeHead(r.status, { ...headers, ...Object.fromEntries(r.headers) }).end(await r.text())
}

createServer((req, res) => {
  const asked = new URL(req.url, 'http://x').pathname
  if (asked === '/api/explore') {
    api(req, res).catch(() => res.writeHead(500, headers).end())
    return
  }
  if (asked.startsWith('/api/')) {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
    return
  }
  if (redirects.has(asked)) {
    res.writeHead(308, { ...headers, Location: redirects.get(asked) }).end()
    return
  }
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  if (path.endsWith('/')) path += 'index.html'
  const file = join(ROOT, path)
  let size
  try {
    size = statSync(file).size
  } catch {
    // as on Vercel: an address that is not a file answers 404 with site/404.html
    let notFound = 'Not found'
    try {
      notFound = readFileSync(join(ROOT, '404.html'))
    } catch {
      // no not-found page: plain text
    }
    res.writeHead(404, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }).end(notFound)
    return
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream'
  const body = readFileSync(file)
  // videos need byte ranges for Safari and for seeking
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '')
  if (range) {
    const start = Number(range[1])
    const end = range[2] ? Number(range[2]) : size - 1
    res.writeHead(206, {
      ...headers,
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    })
    res.end(body.subarray(start, end + 1))
    return
  }
  res.writeHead(200, { ...headers, 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' })
  res.end(body)
}).listen(PORT, () => console.log(`site preview on http://localhost:${PORT}`))
