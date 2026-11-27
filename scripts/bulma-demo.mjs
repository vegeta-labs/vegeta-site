// Installs the Bulma demo package (a GitHub Release asset, same format as Trunks') into site/bulma/demo/ and records it in
// bulma-demo.lock (plan 42). Usage: node scripts/bulma-demo.mjs <bulma-demo-vX.tar.gz> <its .sha256 file>
// Until Bulma publishes the pack, BULMA_DEMO_DEV=1 installs a pack built from a development commit: the lock then says
// "dev": true, and check-site and the public snapshot refuse it, so it can be built against but never released.
// The tarball must match its published SHA-256 and hold only plain files and directories at safe relative paths; every
// file must match the package's MANIFEST.sha256, and the package's commit (snapshot-info.json) must equal bulma.ref.
// Everything is checked in a temporary directory; only then is the whole site/bulma/demo/ replaced and the lock written.
// No file in it is ever edited by hand.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { gunzipSync } from 'node:zlib'

const [tgz, shaFile] = process.argv.slice(2)
if (!tgz || !shaFile) {
  console.error('usage: node scripts/bulma-demo.mjs <bulma-demo-vX.tar.gz> <its .sha256 file>')
  process.exit(1)
}
const DEST = 'site/bulma/demo'
const DEV = process.env.BULMA_DEMO_DEV === '1'
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
// throws, so the temporary directory is always removed (finally below) before the process ends with an error
const die = (m) => {
  throw new Error(m)
}
process.on('uncaughtException', (e) => {
  console.error('bulma demo: ' + e.message)
  process.exit(1)
})
const archive = readFileSync(tgz)
const tarSha = sha(archive)
const [want, name] = readFileSync(shaFile, 'utf8').trim().split(/\s+/)
if (tarSha !== want) die(`${basename(tgz)} is ${tarSha}, the .sha256 file says ${want}`)
if (name !== basename(tgz)) die(`the .sha256 file names ${name}, not ${basename(tgz)}`)

// Read the tar headers directly (ustar: name at 0, size at 124, type flag at 156, prefix at 345, 512-byte blocks), so no
// tool's listing format is parsed: only regular files and directories, relative paths, no "..". A pax extended header
// (type x or g, written by both GNU and BSD tar) is metadata, but it can rename the next entry or make it a link, so its
// path and linkpath records are read and checked too.
const tar = gunzipSync(archive)
const field = (b, at, len) =>
  b
    .subarray(at, at + len)
    .toString('utf8')
    .replace(/\0[\s\S]*$/, '')
const safe = (path) => path && !path.startsWith('/') && !path.split('/').includes('..')
let next = null
for (let at = 0; at + 512 <= tar.length;) {
  const h = tar.subarray(at, at + 512)
  if (h.every((x) => x === 0)) break
  const type = String.fromCharCode(h[156] || 48)
  const size = parseInt(field(h, 124, 12).trim() || '0', 8)
  const data = tar.subarray(at + 512, at + 512 + size)
  if (type === 'x' || type === 'g') {
    const records = Object.fromEntries([...data.toString('utf8').matchAll(/^\d+ ([^=\n]+)=(.*)$/gm)].map((m) => [m[1], m[2]]))
    if ('linkpath' in records) die(`a pax header in the package makes a link: ${records.linkpath}`)
    if ('path' in records && !safe(records.path)) die(`unsafe path in a pax header: ${records.path}`)
    if (type === 'x') next = records.path ?? null
  } else {
    const path = next ?? [field(h, 345, 155), field(h, 0, 100)].filter(Boolean).join('/')
    next = null
    if (!['0', '5'].includes(type)) die(`unsafe entry in the package (type ${type}): ${path}`)
    if (!safe(path)) die(`unsafe path in the package: ${path}`)
  }
  at += 512 + Math.ceil(size / 512) * 512
}

const tmp = mkdtempSync(join('site/bulma', '.demo-'))
try {
  execFileSync('tar', ['-xzf', tgz, '-C', tmp])
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
  const files = walk(tmp)
    .map((f) => relative(tmp, f))
    .sort()
  for (const f of files) if (!lstatSync(join(tmp, f)).isFile()) die(`${f} is not a plain file`)
  const manifest = readFileSync(join(tmp, 'MANIFEST.sha256'), 'utf8').trim().split('\n')
  const listed = new Map(manifest.map((l) => /^([0-9a-f]{64}) {2}(.+)$/.exec(l) ?? die(`bad MANIFEST line: ${l}`)).map((m) => [m[2], m[1]]))
  for (const f of files) if (f !== 'MANIFEST.sha256' && listed.get(f) !== sha(readFileSync(join(tmp, f)))) die(`${f} is not in MANIFEST.sha256 or differs`)
  for (const f of listed.keys()) if (!files.includes(f)) die(`${f} is in MANIFEST.sha256 but not in the package`)
  const info = JSON.parse(readFileSync(join(tmp, 'snapshot-info.json'), 'utf8'))
  const ref = readFileSync('bulma.ref', 'utf8').trim()
  if (!DEV && info.commit !== ref) die(`the package was built from ${info.commit}, bulma.ref is ${ref}`)

  const lock = {
    package: basename(tgz),
    sha256: tarSha,
    version: info.version,
    commit: info.commit,
    built_at: info.built_at,
    manifest_sha256: sha(readFileSync(join(tmp, 'MANIFEST.sha256'))),
    files: Object.fromEntries([...listed].sort()),
    ...(DEV ? { dev: true } : {}),
  }
  // all checks passed: replace the directory, then the lock
  rmSync(DEST, { recursive: true, force: true })
  renameSync(tmp, DEST)
  writeFileSync('bulma-demo.lock', JSON.stringify(lock, null, 2) + '\n')
  console.log(
    `bulma demo: v${info.version} (${info.commit.slice(0, 7)}${DEV ? ', development pack' : ''}) installed in ${DEST}, ${files.length} files; bulma-demo.lock written`,
  )
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
