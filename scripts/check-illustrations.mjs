// Step illustrations are checked as complete text sequences against the pinned apps and locked demo.
// The Goten's pure sample/engines and Trunks's display names are bundled in a temporary directory, leaving vendor/ clean.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

export const illustrationPattern = /<div\b[^>]*\bdata-illus="([a-z]+)"[^>]*>[\s\S]*?<!-- \/illus -->/g
const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s+…/g, '…').trim()
const text = (s) =>
  norm(
    s
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#10003;/g, '✓')
      .replace(/&amp;/g, '&'),
  )
const money = (v) => '£' + (v / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pounds = (v) => '£' + (v / 100).toLocaleString('en-GB')

export function checkIllustrations({ html, css, goten, trunks, snapshot, fail }) {
  const scratch = mkdtempSync(join(tmpdir(), 'site-illustrations-'))
  let source
  try {
    const from = (file) => JSON.stringify(resolve(goten, 'src/lib', file + '.ts'))
    const entry = join(scratch, 'entry.mjs')
    writeFileSync(
      entry,
      `
      import * as sample from ${from('sample')};
      import {reconcile, decide} from ${from('reconcile')};
      import {distribute} from ${from('waterfall')};
      import {displayName} from ${JSON.stringify(resolve(trunks, 'src/web/presentation.ts'))};
      const rec = (decisions) => reconcile({commitments: sample.SAMPLE_COMMITMENTS, lines: sample.SAMPLE_BANK,
        decisions, asOf: sample.SAMPLE_SETTINGS.asOf, thresholdDays: sample.SAMPLE_SETTINGS.agedThresholdDays}).result;
      const line = sample.SAMPLE_BANK.find(x => x.id === 't03');
      const commitment = sample.SAMPLE_COMMITMENTS.find(x => x.id === 'c03');
      const expected = ${readFileSync(join(goten, 'src/lib/sample.expected.json'), 'utf8')};
      const holdings = expected.allocation.filter(x=>x.invested>0).map(x=>({id:x.id,
        name:sample.SAMPLE_COMMITMENTS.find(c=>c.id===x.id).name,capital:x.invested}));
      globalThis.illustrationSource = {displayName, sample, expected, before:rec({}), after:rec({t03:decide(line,commitment)}),
        exit:distribute({holdings,...sample.SAMPLE_EXIT}).result};
    `,
    )
    const bundle = join(scratch, 'bundle.js')
    execFileSync('npx', ['--no-install', 'rolldown', entry, '-f', 'iife', '-o', bundle], { stdio: 'pipe' })
    const box = {}
    runInNewContext(readFileSync(bundle, 'utf8'), { globalThis: box }, { timeout: 5000 })
    source = box.illustrationSource
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  const { sample, expected, before, after, exit } = source
  // Category, field and template names are shown as the released Trunks UI names them; an ID without a UI name fails.
  const named = (id) => {
    const name = source.displayName(id)
    if (typeof id !== 'string' || !name || name === id) fail(`illustrations: Trunks UI has no display name for ${id}`)
    return name
  }
  const commits = sample.SAMPLE_COMMITMENTS
  const receipt = (id) => sample.SAMPLE_BANK.find((l) => l.id === id)
  const person = commits.find((c) => c.id === 'c03')
  const candidate = before.lines.find((l) => l.line.id === 't03').candidates[0]
  if (candidate.commitmentId !== person.id) fail('illustrations: the sample reconciliation candidate changed')
  const bankRow = (id, ref, state) => {
    const l = receipt(id)
    return [l.payer, l.date, '·', ref, money(l.amount), state]
  }
  const allocation = expected.allocation.filter((r) => r.invested > 0)
  const capital = allocation.reduce((sum, r) => sum + r.invested, 0)
  const fee = sample.SAMPLE_FEES.find((f) => f.id === 'f1')
  if (fee.kind !== 'percent' || fee.payer !== 'investors') fail('illustrations: the platform fee terms changed')
  const companyFees = sample.SAMPLE_FEES.filter((f) => f.payer === 'company')
  if (companyFees.some((f) => f.kind !== 'fixed')) fail('illustrations: company fees need a new source mapping')
  const terms = sample.SAMPLE_EXIT
  const pct = (v) => v / 100 + '%'
  const carryRate = terms.carry.k / 100
  const remaining = terms.proceeds - exit.costsPaid - exit.returnOfCapital - exit.hurdlePaid - exit.catchUpTranche
  const details = snapshot?.details ?? {}
  const email = details.E0001
  const checked = details.E0024
  const fields = Object.fromEntries((email?.fields ?? []).map((f) => [f.field, f.value]))
  const excerpt = /I transferred .*? with the reference NW-001/.exec(email?.text ?? '')?.[0]
  if (!excerpt) fail('illustrations: E0001 excerpt changed; review the extraction illustration')
  const label = email?.labels.find((l) => l.source === 'model' && l.adopted)
  const links = checked?.e3.links
  const reply = email?.e3.replies.find((r) => r.templateId === 'payment_received')
  if (!reply || reply.status !== 'draft' || !reply.checkOk) fail('illustrations: E0001 no longer has the checked payment_received draft')
  if (!links?.authenticatedSender || links?.ledger !== 'not_received') fail('illustrations: E0024 authentication or ledger changed')
  // States after human approval and ledger wording come from the released UI, not invented snapshot states.
  const ui = readFileSync(join(trunks, 'src/web/CaseE3.tsx'), 'utf8')
  const approved = /approved: '([^']+)'/.exec(ui)?.[1]
  const draft = /draft: '([^']+)'/.exec(ui)?.[1]
  const ledger = /l\.ledger === 'not_received' \? '([^']+)'/.exec(ui)?.[1]
  for (const phrase of ['Copy text', 'authenticated sender', 'computed by the rules:'])
    if (!ui.includes(phrase)) fail(`illustrations: Trunks UI no longer contains ${phrase}`)
  const want = {
    reconciliation: [
      'Bank statement',
      'Needs your review ·',
      before.pendingSuggestions,
      after.pendingSuggestions,
      ...bankRow('t01', receipt('t01').reference, 'Matched'),
      ...bankRow('t03', 'no reference', 'Review Confirmed'),
      person.name,
      person.reference,
      'score',
      candidate.score,
      '—',
      candidate.reasons.join(', '),
      'Confirm ✓ Confirmed by a person',
      ...bankRow('t04', receipt('t04').reference, 'Matched'),
    ],
    allocation: [
      'Closing allocation',
      'Platform fee ·',
      pct(fee.value),
      'Investor Received Fee Invested',
      ...expected.allocation
        .slice(0, 4)
        .flatMap((r) => [
          commits.find((c) => c.id === r.id).name,
          money(expected.reconcile.find((c) => c.id === r.id).received),
          money(r.fees.f1),
          money(r.invested),
        ]),
      'and',
      allocation.length - 4,
      'more investors ·',
      money(capital),
      'invested',
      'Wire to company',
      money(capital - companyFees.reduce((sum, f) => sum + f.value, 0)),
    ],
    exit: [
      'Exit waterfall',
      pounds(terms.proceeds),
      'exit',
      pct(terms.carry.k),
      'carry ·',
      pct(terms.carry.h),
      'hurdle ·',
      terms.years100 / 100,
      'years · full catch-up',
      pounds(exit.costsPaid),
      'exit costs first ·',
      pounds(terms.proceeds - exit.costsPaid),
      'to share',
      'Return of capital',
      money(exit.returnOfCapital),
      '→ investors',
      'Preferred return',
      money(exit.hurdlePaid),
      '→ investors',
      'Lead catch-up',
      money(exit.catchUpTranche),
      '→ lead',
      'Carry split',
      100 - carryRate,
      '/',
      carryRate,
      money(remaining),
      '→ investors',
      pct(10000 - terms.carry.k),
      '· lead',
      pct(terms.carry.k),
      'Investors',
      money(exit.investorsTotal),
      'Carry to the lead',
      money(exit.carry),
    ],
    read: [
      'Incoming mail Read-only',
      ...['E0001', 'E0045', 'E0053', 'E0225'].flatMap((id) => {
        const d = details[id]
        return [d?.fromName, id, d?.subject, ...(d?.e3.adopted.map(named) ?? [undefined]), d?.e3.risk.final]
      }),
    ],
    understand: [
      email?.fromName,
      email?.id,
      '…' + excerpt + '…',
      'Read by code',
      named('amount'),
      fields.amount,
      named('payment_date'),
      fields.payment_date,
      named('reference'),
      fields.reference,
      'Model',
      named(label?.classId),
      '(' + label?.confidence + ')',
    ],
    check: [
      'Linked and checked',
      checked?.id,
      'Sender',
      `${links?.contact?.name} (${links?.contact?.id})`,
      'authenticated sender',
      'Commitment',
      links?.commitment?.investorName,
      links?.commitment?.reference,
      'Deal',
      links?.deal,
      'Ledger',
      ledger,
      checked?.e3.risk.final,
      'computed by the rules:',
      checked?.e3.risk.computed,
    ],
    prepare: [
      'Reply prepared',
      email?.id,
      '·',
      named(reply?.templateId),
      'To',
      reply?.recipient,
      'Subject',
      reply?.subject,
      reply?.text.split('\n\n').slice(0, 2).join(' '),
      draft,
      approved,
      'Copy text',
      '↗',
    ],
  }
  if (terms.carry.mode !== 'fixed' || terms.carry.c !== 10000) fail('illustrations: the exit illustration assumes full catch-up')
  // Bar lengths are rounded to one decimal place relative to the largest tranche.
  for (const [name, value] of [
    ['capital', exit.returnOfCapital],
    ['hurdle', exit.hurdlePaid],
    ['catchup', exit.catchUpTranche],
    ['split', remaining],
  ]) {
    const width = /width:\s*([\d.]+)%/.exec(new RegExp(`\\.exit-flow__bar--${name}\\s*\\{([^}]+)}`).exec(css)?.[1] ?? '')?.[1]
    const ratio = Math.round((value / remaining) * 1000) / 10
    if (Number(width) !== ratio) fail(`illustrations: ${name} bar must be ${ratio}% of the largest tranche`)
  }
  if (!new RegExp(`linear-gradient\\(90deg, var\\(--text\\) ${100 - carryRate}%, #e39a6c ${100 - carryRate}%\\)`).test(css))
    fail('illustrations: the carry bar must use the sample investor/lead split')
  // Full descriptions bind the figures to their meaning, not merely to a set of valid numbers.
  const extractedDate = email.extraction.dates[0].at
  const dateText = email.text.slice(extractedDate.originalStart, extractedDate.originalEnd)
  const replyMoney = /We have received ([A-Z]{3} [\d,.]+)/.exec(reply.text)?.[1]
  const descriptions = {
    reconciliation: `A ${money(receipt('t03').amount)} receipt from ${receipt('t03').payer} with no reference is suggested for ${person.name}, score ${candidate.score}, because the payer name and amount match. A person confirms it; receipts waiting for review go from ${before.pendingSuggestions} to ${after.pendingSuggestions}.`,
    allocation: `Closing allocation with a ${pct(fee.value)} platform fee. ${money(capital)} is invested and ${money(capital - companyFees.reduce((sum, f) => sum + f.value, 0))} is wired to the company.`,
    exit: `A ${pounds(terms.proceeds)} exit less ${pounds(exit.costsPaid)} costs: capital, preferred return, lead catch-up and the carry split are distributed in order. Investors receive ${money(exit.investorsTotal)}; carry to the lead is ${money(exit.carry)}.`,
    read: 'Four sample emails arrive, then each receives a category and a risk level.',
    understand: `${email.fromName.split(' ')[0]} transferred ${fields.amount} on ${dateText} with reference ${fields.reference}. Code reads the amount, date and reference. The model classifies it as ${named(label.classId)} with ${label.confidence} confidence.`,
    check: `${links.contact.name} is an authenticated sender, linked to commitment ${links.commitment.reference} and ${links.deal}. Imported Goten ledger says not fully received. The rules compute ${checked.e3.risk.computed} risk.`,
    prepare: `The ${named(reply.templateId)} draft tells ${email.fromName.split(' ')[0]} her ${replyMoney} commitment is paid in full. A person approves the reply and copies the text to send from their own mail client.`,
  }
  const keys = { '/goten/': ['reconciliation', 'allocation', 'exit'], '/trunks/': ['read', 'understand', 'check', 'prepare'] }
  for (const [url, names] of Object.entries(keys)) {
    const cards = [...html[url].matchAll(/<article\b[^>]*\bdata-card\b[^>]*>[\s\S]*?<\/article>/g)]
    if (cards.length !== names.length) fail(`${url}: expected ${names.length} illustration cards`)
    cards.forEach(([card], i) => {
      const matches = [...card.matchAll(illustrationPattern)]
      const key = names[i]
      if (matches.length !== 1 || matches[0]?.[1] !== key || (card.match(/\bdata-illus\b/g) ?? []).length !== 1) {
        fail(`${url} step ${i + 1}: expected one ${key} illustration`)
        return
      }
      if (/<video\b|<picture\b|\bdata-video\b/.test(card)) fail(`${url} ${key}: obsolete clip markup`)
      const body = matches[0][0]
      if (!/role="img"/.test(body) || !/aria-label="[^"]+"/.test(body) || (!/<div aria-hidden="true">/.test(body) && key !== 'reconciliation'))
        fail(`${url} ${key}: a stable accessible description and hidden animation text are required`)
      const accessible = /aria-label="([^"]+)"/.exec(body)?.[1] ?? ''
      if (norm(accessible) !== norm(descriptions[key])) fail(`${url} ${key}: accessible description differs from its sample source`)
      const numbers = (s) => s.match(/£?\d+(?:[.,]\d+)*(?:%)?/g) ?? []
      for (const number of numbers(accessible))
        if (!numbers(want[key].join(' ')).includes(number)) fail(`${url} ${key}: accessible figure ${number} has no sample source`)
      const actual = text(body)
      const backed = norm(want[key].join(' '))
      if (actual !== backed) fail(`${url} ${key}: illustration text differs from its sample source\n  expected: ${backed}\n  actual:   ${actual}`)
    })
    if ([...html[url].matchAll(illustrationPattern)].length !== names.length) fail(`${url}: an illustration outside its expected card or a missing boundary`)
  }
}
