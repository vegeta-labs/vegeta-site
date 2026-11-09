// Plan 26: a digest of an article's reader-visible text, unaffected by formatting. The build records it; check-site compares it without the private drafts.
import { createHash } from 'node:crypto'

export const articleText = (page) =>
  (/<article class="article">([\s\S]*)<\/article>/.exec(page.replace(/<!--[\s\S]*?-->/g, ''))?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, '')

export const digest = (page) => createHash('sha256').update(articleText(page)).digest('hex')

// the descriptions of an article's figures, in order
export const labelsIn = (page) =>
  [
    ...(/<article class="article">([\s\S]*)<\/article>/.exec(page.replace(/<!--[\s\S]*?-->/g, ''))?.[1] ?? '').matchAll(/<video\b[^>]*\saria-label="([^"]*)"/g),
  ].map((m) => m[1].replace(/\s+/g, ' '))
