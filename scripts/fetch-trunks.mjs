// Checks out the public Trunks repo at the commit in trunks.ref into vendor/trunks (not committed).
// check-site reads Trunks release notes (CHANGELOG.md), its English docs and its on-screen labels from it, so the
// /trunks/ page is checked against the released Trunks (plan 13 §8.1 K3–K5). After each Trunks release, put the new public
// commit in trunks.ref and the new demo package in site/trunks/demo/ (scripts/trunks-demo.mjs).
// TRUNKS_REF=main checks out the public repo's latest main instead (the weekly drift CI job).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'

const REPO = 'https://github.com/vegeta-labs/trunks'
const DIR = 'vendor/trunks'
const ref = process.env.TRUNKS_REF ?? readFileSync('trunks.ref', 'utf8').trim()
if (!process.env.TRUNKS_REF && !/^[0-9a-f]{40}$/.test(ref)) {
  console.error('trunks: trunks.ref must hold one full commit id')
  process.exit(1)
}
const git = (...a) =>
  execFileSync('git', ['-C', DIR, ...a], { stdio: 'pipe' })
    .toString()
    .trim()
if (!existsSync(`${DIR}/.git`)) {
  mkdirSync(DIR, { recursive: true })
  git('init', '-q')
}
let head = ''
try {
  head = git('rev-parse', 'HEAD')
} catch {
  // empty repository: nothing checked out yet
}
if (head === ref && !git('status', '--porcelain')) {
  console.log(`trunks: already at ${ref.slice(0, 7)}`)
} else {
  try {
    git('fetch', '-q', '--depth', '1', REPO, ref)
    git('checkout', '-q', '--force', '--detach', 'FETCH_HEAD')
    git('clean', '-q', '-fdx')
  } catch (e) {
    console.error(
      `trunks: cannot check out ${ref} from ${REPO} (${String(e.stderr ?? e.message)
        .trim()
        .split('\n')
        .pop()})`,
    )
    process.exit(1)
  }
  console.log(`trunks: checked out ${git('rev-parse', '--short', 'HEAD')}`)
}
