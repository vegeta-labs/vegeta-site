// Checks out each product's public repo at the docs pin in site-src/docs.json into vendor/docs/<id> (not committed).
// The docs pin is separate from goten.ref and trunks.ref (plan 30 §5): a docs-only update in a product repo moves only it.
// scripts/build-docs.mjs reads the Markdown from these checkouts.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'

const spec = JSON.parse(readFileSync('site-src/docs.json', 'utf8'))
let failed = false
for (const { id, source } of spec.products) {
  if (!source) continue
  const { repo, ref } = source
  if (!/^https:\/\/github\.com\/vegeta-labs\/[a-z-]+$/.test(repo) || !/^[0-9a-f]{40}$/.test(ref)) {
    console.error(`docs: ${id} needs a public vegeta-labs repo and one full commit id`)
    failed = true
    continue
  }
  const dir = `vendor/docs/${id}`
  const git = (...a) =>
    execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' })
      .toString()
      .trim()
  if (!existsSync(`${dir}/.git`)) {
    mkdirSync(dir, { recursive: true })
    git('init', '-q')
  }
  let head = ''
  try {
    head = git('rev-parse', 'HEAD')
  } catch {
    // empty repository: nothing checked out yet
  }
  if (head === ref && !git('status', '--porcelain')) {
    console.log(`docs: ${id} already at ${ref.slice(0, 7)}`)
    continue
  }
  try {
    git('fetch', '-q', '--depth', '1', repo, ref)
    git('checkout', '-q', '--force', '--detach', 'FETCH_HEAD')
    git('clean', '-q', '-fdx')
    console.log(`docs: ${id} checked out ${git('rev-parse', '--short', 'HEAD')}`)
  } catch (e) {
    console.error(
      `docs: cannot check out ${ref} from ${repo} (${String(e.stderr ?? e.message)
        .trim()
        .split('\n')
        .pop()})`,
    )
    failed = true
  }
}
if (failed) process.exit(1)
