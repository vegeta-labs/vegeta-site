// Plan 22: the blogs' worked examples, computed with the pinned public code (vendor/toolkit, vendor/inbox).
// `node scripts/blog-example.mjs` prints the results as JSON; `--write` saves them to site-src/blog-example.json, which
// scripts/check-site.mjs recomputes and compares. Nothing here is written by hand except the inputs below.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

export const INPUT = {
  asOf: '2026-10-16',
  thresholdDays: 10,
  feeBasis: 'deducted',
  feeBps: 300,
  minimum: 100000,
  priceMicros: 1000000,
  // pence; the film's six investors
  people: [
    ['sen-1', 'Son Goku', 'SEN-001', 1000000],
    ['sen-2', 'Krillin', 'SEN-002', 500000],
    ['sen-3', 'Piccolo', 'SEN-003', 200000],
    ['sen-4', 'Android 18', 'SEN-004', 300000],
    ['sen-5', 'Yamcha', 'SEN-005', 100000],
    ['sen-6', 'Tien', 'SEN-006', 400000],
  ],
  // Piccolo's payment carries no reference: the uncertain receipt the article follows
  bank: [
    ['t1', 'S GOKU', 'SEN-001', 1000000],
    ['t2', 'K RILLIN', 'SEN-002', 500000],
    ['t3', 'PICCOLO', '', 200000],
    ['t4', 'A18', 'SEN-004', 300000],
    ['t5', 'YAMCHA', 'SEN-005', 100000],
    ['t6', 'T SHIN', 'SEN-006', 400000],
  ],
  uncertain: { line: 't3', commitment: 'sen-3' },
  exit: { proceeds: 9000000, exitCosts: 150000, years100: 500, carry: { mode: 'fixed', k: 2000, h: 800, c: 10000 } },
}

/** Runs the pinned code on INPUT. toolkit and inbox are the source directories. */
export function computeExample(toolkit = 'vendor/toolkit', inbox = 'vendor/inbox') {
  const scratch = mkdtempSync(join(tmpdir(), 'blog-example-'))
  try {
    const lib = (root, file) => JSON.stringify(resolve(root, 'src/lib', file))
    const entry = join(scratch, 'entry.mjs')
    writeFileSync(
      entry,
      `
      import {reconcile, decide, handoffToAllocation} from ${lib(toolkit, 'reconcile.ts')};
      import {allocate} from ${lib(toolkit, 'allocation.ts')};
      import {distribute} from ${lib(toolkit, 'waterfall.ts')};
      import {selectTemplate, checkTemplate} from ${lib(inbox, 'draft.ts')};
      import {computeRisk, hasPressure, PRESSURE_WORDS} from ${lib(inbox, 'risk.ts')};
      globalThis.engines = {reconcile, decide, handoffToAllocation, allocate, distribute, selectTemplate, checkTemplate, computeRisk, hasPressure, PRESSURE_WORDS};
    `,
    )
    const bundle = join(scratch, 'bundle.js')
    execFileSync('npx', ['--no-install', 'rolldown', entry, '-f', 'iife', '-o', bundle], { stdio: 'pipe' })
    const box = {}
    runInNewContext(readFileSync(bundle, 'utf8'), { globalThis: box }, { timeout: 5000 })
    return run(box.engines, parseTemplates(readFileSync(join(inbox, 'config/default/templates.yaml'), 'utf8')))
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

/** The template file's own ids, subjects and bodies (a small reader: the site has no YAML dependency). */
function parseTemplates(text) {
  return text
    .split(/^  - id: /m)
    .slice(1)
    .map((block) => {
      const [id, ...rest] = block.split('\n')
      const subject = /^ {4}subject: "(.*)"$/m.exec(block)?.[1] ?? ''
      const bodyAt = rest.findIndex((l) => /^ {4}body: \|/.test(l))
      const body = rest
        .slice(bodyAt + 1)
        .filter((l) => /^ {6}/.test(l) || !l.trim())
        .map((l) => l.slice(6))
        .join('\n')
        .trim()
      return { id: id.trim(), subject, body }
    })
}

function run(
  { reconcile, decide, handoffToAllocation, allocate, distribute, selectTemplate, checkTemplate, computeRisk, hasPressure, PRESSURE_WORDS },
  templateDefs,
) {
  const i = INPUT
  const commitments = i.people.map(([id, name, reference, cashDue]) => ({ id, name, email: `${id}@example.test`, reference, cashDue, scheme: 'none' }))
  const lines = i.bank.map(([id, payer, reference, amount]) => ({ id, txnId: id, date: '2026-10-07', amount, payer, reference }))
  const rec = (decisions) => reconcile({ commitments, lines, decisions, asOf: i.asOf, thresholdDays: i.thresholdDays }).result
  const before = rec({})
  const uncertainLine = lines.find((l) => l.id === i.uncertain.line)
  const after = rec({
    [uncertainLine.id]: decide(
      uncertainLine,
      commitments.find((c) => c.id === i.uncertain.commitment),
    ),
  })
  const blocked = handoffToAllocation(before)
  const handoff = handoffToAllocation(after)
  if (!handoff.ok) throw new Error(handoff.reason)
  const close = allocate({
    feeBasis: i.feeBasis,
    minimum: i.minimum,
    cap: null,
    priceMicros: i.priceMicros,
    fees: [{ id: 'f1', label: 'Investor fee', kind: 'percent', value: i.feeBps, payer: 'investors' }],
    investors: handoff.value.investors,
  })
  if (!close.result) throw new Error('allocation failed: ' + JSON.stringify(close))
  const holdings = close.result.rows.filter((r) => r.invested > 0).map((r) => ({ id: r.id, name: r.name, capital: r.invested }))
  const exit = distribute({ holdings, ...i.exit })
  if (!exit.result) throw new Error('distribution failed: ' + JSON.stringify(exit))

  const line = (r, id) => {
    const l = r.lines.find((x) => x.line.id === id)
    return {
      status: l.status,
      candidates: (l.candidates ?? []).map((c) => ({ name: commitments.find((x) => x.id === c.commitmentId)?.name, score: c.score, reasons: c.reasons })),
    }
  }
  // Trunks: one payment_query, sender authenticated and entitled, risk not raised, then the other conditions
  const templates = new Map(templateDefs.map((t) => [t.id, checkTemplate(t).meta]))
  const bodies = Object.fromEntries(templateDefs.map((t) => [t.id, t.body]))
  const q = {
    adopted: ['payment_query'],
    classes: [{ id: 'payment_query', risk_floor: 'medium' }],
    risk: 'medium',
    templates,
    mayDisclose: true,
    linkedCommitment: true,
    ledger: 'received',
    payment: null,
    receivedDate: '2026-10-16', // a Friday
    holidays: new Set(),
  }
  const risk = (over) =>
    computeRisk({
      classes: q.classes,
      labels: ['payment_query'],
      signals: {},
      accountPresent: false,
      uetrCandidatesInvalid: 0,
      amountsBody: [],
      amountsAttachment: [],
      attachmentBlockedOrOverLimit: false,
      pressure: false,
      plannedCloseDate: null,
      receivedDate: q.receivedDate,
      holidays: q.holidays,
      ...over,
    }).level
  const pick = (over) => selectTemplate({ ...q, ...over }).template
  return {
    goten: {
      before: {
        booked: before.totals?.booked ?? null,
        unbooked: before.totals?.unbooked ?? null,
        pending: before.pendingSuggestions,
        handoffBlocked: !blocked.ok,
      },
      uncertainBefore: line(before, 't3'),
      exactMatch: line(before, 't1'),
      duplicate: (() => {
        const twin = { ...lines[0], txnId: null }
        const r = reconcile({
          commitments,
          lines: [
            { ...twin, id: 'a' },
            { ...twin, id: 'b' },
          ],
          decisions: {},
          asOf: i.asOf,
          thresholdDays: i.thresholdDays,
        }).result
        return r.lines.map((l) => l.status)
      })(),
      uncertainAfter: line(after, 't3'),
      after: { booked: after.totals?.booked ?? null, unbooked: after.totals?.unbooked ?? null, pending: after.pendingSuggestions },
      close: {
        rows: close.result.rows.map((r) => ({ name: r.name, received: r.received, fees: r.feesTotal, invested: r.invested, refund: r.refund })),
        totals: close.result.totals,
      },
      exit: {
        steps: exit.result.steps.map((s) => ({ label: s.label, toInvestors: s.toInvestors, toLead: s.toLead })),
        capital: exit.result.capital,
        costsPaid: exit.result.costsPaid,
        carry: exit.result.carry,
        investorsTotal: exit.result.investorsTotal,
        rows: exit.result.rows.map((r) => ({ name: r.name, capital: r.capital, distribution: r.distribution })),
      },
    },
    trunks: {
      paidInFull: pick({}),
      recentPayment: pick({ ledger: 'not_received', payment: { status: 'ok', date: '2026-10-12' } }), // four working days
      oldPayment: pick({ ledger: 'not_received', payment: { status: 'ok', date: '2026-10-09' } }), // five working days
      noPaymentDate: pick({ ledger: 'not_received' }),
      ledgerUnknown: pick({ ledger: 'unknown' }),
      noCommitment: pick({ linkedCommitment: false, ledger: null }),
      notEntitled: pick({ mayDisclose: false }),
      riskRaised: pick({ risk: 'high' }),
      unclassified: selectTemplate({ ...q, adopted: [], classes: [] }).template,
      risk: {
        plain: risk({}),
        today: risk({ pressure: hasPressure(['I paid today']) }),
        urgent: risk({ pressure: hasPressure(['This is urgent']) }),
        closeIn3: risk({ plannedCloseDate: '2026-10-21' }),
        closeIn4: risk({ plannedCloseDate: '2026-10-22' }),
      },
      words: PRESSURE_WORDS.filter((w) => ['today', 'urgent'].includes(w)),
      bodies: Object.fromEntries(
        ['payment_received', 'payment_wait', 'payment_need_evidence', 'payment_need_reference', 'safe_ack'].map((id) => [id, bodies[id]]),
      ),
    },
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = computeExample()
  const text = JSON.stringify(result, null, 2) + '\n'
  if (process.argv.includes('--write')) writeFileSync('site-src/blog-example.json', text)
  else process.stdout.write(text)
}
