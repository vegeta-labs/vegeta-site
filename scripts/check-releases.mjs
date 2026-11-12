// Plan 36 §11 F3d: is the site behind a product release? Compares each module's newest release tag in its public repo with the
// version the site is built from (site-src/docs.json). Prints what to do and exits 1 when a module is behind; the daily
// "Goten and Trunks drift" workflow then opens or updates an issue. Any error (network, no tags, bad version) exits 2, which
// fails the job without an issue. Tags count as releases: the products tag at their release step.
// Usage: node scripts/check-releases.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const parse = (v) => /^v(\d+)\.(\d+)\.(\d+)$/.exec(v)?.slice(1).map(Number)
const newer = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}
process.on('uncaughtException', (e) => {
  console.error(e.message)
  process.exit(2)
})
const spec = JSON.parse(readFileSync('site-src/docs.json', 'utf8'))
const behind = []
for (const p of spec.products) {
  const shown = parse(p.version)
  if (!shown) throw new Error(`site-src/docs.json: ${p.name} version "${p.version}" is not vX.Y.Z`)
  const tags = execFileSync('git', ['ls-remote', '--tags', '--refs', `${p.source.repo}.git`], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.split('refs/tags/')[1])
    .filter((t) => t && parse(t))
  if (!tags.length) throw new Error(`${p.source.repo}: no release tags found`)
  const latest = tags.reduce((a, b) => (newer(parse(b), parse(a)) ? b : a))
  console.log(`${p.name}: site ${p.version}, latest release ${latest}`)
  if (newer(parse(latest), shown)) behind.push(`${p.name} ${latest} is released; the site shows ${p.version}.`)
}
if (behind.length) {
  console.log(
    [
      '',
      ...behind,
      '',
      'To update: move the pins (goten.ref or trunks.ref, and the docs pin and version in site-src/docs.json; for Trunks also the',
      'demo package), run npm run goten:fetch, trunks:fetch, docs:fetch, node scripts/build-docs.mjs and npm run site:check,',
      'then the owner checks a local preview before the release steps (handbook §8, G3).',
    ].join('\n'),
  )
  process.exit(1)
}
