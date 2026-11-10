# Architecture

> Goten v1.3.1. Source: https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/build/architecture.md

Goten is a client-only React 19 and TypeScript app, built with Vite. There is no backend. For the reasoning behind each decision, see the [technical design](https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/02_TECH_DESIGN.md).

## Layout

```
src/
  lib/          calculation engines: pure functions, no React
  state.ts      app state and reducer, hand-offs, activity logging, saving
  derive.ts     typed text → engine inputs, with error locations
  components/   the screens and shared UI
  tour/         the guided tour script
  config.ts     disclaimer and privacy text, feedback link
  glossary.ts   explanations behind the "?" terms
fixtures/       sample CSV files for the importers
scripts/
  oracle/       independent Python implementation
  mutation-check.mjs, check-coverage.mjs, check-e2e.mjs, check-tokens.mjs
e2e/            Playwright tests
```

## Calculation modules

Everything in `src/lib` is a pure function. Components never do money maths.

| File                   | Responsibility                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `money.ts`             | Parsing of amounts, percentages, prices, dates, multiples and years. Exact arithmetic: `mulDiv`, `splitProRata`, `hurdleAmount`. Formatting. |
| `validate.ts`          | Field limits and the `Errors` collector shared by engines and importers.                                                                     |
| `outcome.ts`           | The `Outcome` result type and check kinds.                                                                                                   |
| `reconcile.ts`         | Reference normalisation, exact and near matches, name similarity, scoring, decisions, investor status, refunds, the hand-off to allocation.  |
| `allocation.ts`        | Investable amounts, the minimum, scale-back, fees, the refund retry, shares, S/EIS estimates, deal-level fees and the wire.                  |
| `waterfall.ts`         | Exit costs, return of capital, fixed carry with hurdle and catch-up, tiered carry, the split between investors.                              |
| `adjust.ts`            | Withdrawal marks, effective cash due and fee payer change records, beside the investor list.                                                 |
| `feePayer.ts`          | The fee payer change preview. It reuses `allocate` and searches for the minimal new cash due.                                                |
| `csv.ts`               | Imports with header matching and atomic validation; CSV output with formula escaping.                                                        |
| `exports.ts`           | Every export format and the closing confirmation text.                                                                                       |
| `activity.ts`          | Appending, numbering and truncating the activity log; its CSV.                                                                               |
| `messages.ts`          | The chase and payment query templates.                                                                                                       |
| `snapshot.ts`          | The allocation-to-holdings snapshot.                                                                                                         |
| `deal.ts`, `sample.ts` | Deal settings and the built-in sample deal.                                                                                                  |

## Exact arithmetic

Money is integer minor units, rates are basis points, share prices are millionths of a currency unit, and multiples and years are hundredths. Every multiplication and division goes through `mulDiv` on `BigInt`, and rounding happens only where a rule calls for it. The compounding hurdle is exact too: whole years are rational and fractional years use a high-precision integer root. There is no floating-point money anywhere.

## Data flow

1. The user types or imports. `AppState` (`src/state.ts`) stores every field as text, so a bad value is reported where it was typed and never becomes zero.
2. `derive.ts` parses text into engine inputs and collects errors with locations. If anything is wrong, the engine does not run.
3. Each engine validates its own input and returns `{ ok: true, result, checks }` or `{ ok: false, errors, internal? }`.
4. Components render the result and checks. They contain no calculations.

Check kinds, defined in `outcome.ts`:

| Kind        | Effect                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `invariant` | A failed check means a bug: `finish()` turns the outcome into an internal error with no figures. |
| `blocker`   | The result is shown; export and hand-off are disabled.                                           |
| `review`    | The result is shown; hand-off is disabled.                                                       |
| `warning`   | The result is shown; nothing is disabled.                                                        |

## Hand-offs and decisions

Hand-offs between modules are snapshots, not live links. Each carries the version of the data it was taken from (`recVersion`, `allocVersion`). A later upstream change makes the downstream page show **out of date** until the user hands off again. While it does, that page cannot copy, export or hand on, and holdings carried from an allocation that is out of date count as out of date too. An allocation that is out of date on a deal with any fee payer change record also shows no figures, because the fee table changes at once and the investor amounts only at the next hand-off.

A reconciliation decision is pinned to fingerprints of the bank line and the investor (`lineFingerprint`, `commitmentFingerprint`). If either changes, the decision is voided for good and the line returns to a person.

The investor list is never rewritten by a withdrawal or a fee payer change. Each is recorded beside it, keyed by investor ID, and decides the effective cash due in `adjust.ts`.

## Persistence

`saveState` in `state.ts` writes the whole state as JSON to `localStorage` under `deal-ops-toolkit:v1`, with a schema version; the current schema is 2, and `parseSaved` shape-checks everything it reads. When storage is full, the oldest activity log entries are dropped first so the deal data is kept, and the page says so. If storage is blocked or full, the page says that too.

## Guided tour

`src/tour/script.ts` is a pure script: each step reads figures from the engines and acts only through the reducer, so the tour can never show or book money differently from the rest of the app. Its progress is stored separately from the deal.

## Security and privacy

- The content security policy in `vercel.json` allows only the site's own scripts, styles and fonts, and sets `connect-src 'none'`. No inline scripts or styles are used.
- There are no analytics and no third-party requests. Fonts are self-hosted, with their licences in `public/licenses/`.
- Deal data is never put in a URL.
