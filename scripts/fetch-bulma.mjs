// Checks out the public Bulma repo at the commit in bulma.ref into vendor/bulma (not committed).
// check-site reads Bulma's release notes (docs/en/RELEASE_NOTES.md), its English docs and its on-screen words from it, so
// the /bulma/ page is checked against the released Bulma (plan 39 S3). After each Bulma release, put the new public commit
// in bulma.ref. BULMA_REF=main checks out the public repo's latest main instead (the weekly drift CI job).
// Before Bulma's first public release (plan 39 D10) BULMA_REPO names a local clone, so the site is built against the
// release candidate; at release bulma.ref becomes the public tag's commit (the same commit) and BULMA_REPO is dropped.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'

const REPO = process.env.BULMA_REPO ?? 'https://github.com/vegeta-labs/bulma'
const DIR = 'vendor/bulma'
const ref = process.env.BULMA_REF ?? readFileSync('bulma.ref', 'utf8').trim()
if (!process.env.BULMA_REF && !/^[0-9a-f]{40}$/.test(ref)) {
  console.error('bulma: bulma.ref must hold one full commit id')
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
  console.log(`bulma: already at ${ref.slice(0, 7)}`)
} else {
  try {
    git('fetch', '-q', '--depth', '1', REPO, ref)
    git('checkout', '-q', '--force', '--detach', 'FETCH_HEAD')
    git('clean', '-q', '-fdx')
  } catch (e) {
    console.error(
      `bulma: cannot check out ${ref} from ${REPO} (${String(e.stderr ?? e.message)
        .trim()
        .split('\n')
        .pop()})`,
    )
    process.exit(1)
  }
  console.log(`bulma: checked out ${git('rev-parse', '--short', 'HEAD')}`)
}
