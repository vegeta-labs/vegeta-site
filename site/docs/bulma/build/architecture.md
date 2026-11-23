# Architecture

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/architecture.md

Bulma is one Node.js and TypeScript application: a Fastify server with a PostgreSQL database, and a React interface built with Vite and served by the same process. This page describes how the code is laid out, how a request is handled and where the business rules live.

To run an instance, see [Run and deploy](https://vegeta-ops.vercel.app/docs/bulma/build/run-and-deploy.md). For what protects the data, see the [security model](https://vegeta-ops.vercel.app/docs/bulma/build/security-model.md).

## Layout

```
src/
  main.ts         the commands: init-secrets, migrate, serve, maintain, audit
  lib/            business rules: pure functions, no database, no HTTP
  server/         Fastify routes, grouped by milestone (d1.ts … d4Work.ts), sign-in, the mail queue, PDFs
  store/          database pool, migrations, audit log, encryption, regime pack storage
  adapters/       outside services: mail, KYC, signatures, file storage, virus scanning
  maintenance/    the retention job
  web/            the React screens, the API client, styles and design tokens
packs/            the regime packs shipped with the software (placeholder text)
assets/fonts/     fonts for the PDFs
fixtures/         sample files
scripts/          the check scripts, the mutation check and the Python oracle
e2e/              Playwright browser tests
deploy/           Compose additions for the real mode
```

## One image, several commands

`src/main.ts` is the only entry point. The same image runs as different services in `docker-compose.yml`:

| Command | Service | What it does |
|---|---|---|
| `init-secrets <dir>` | one-off | Writes the database passwords, master key, HMAC key and first admin password, each to its own file. It never overwrites a file that exists. |
| `migrate [--roles-only]` | `migrate` | Creates the database roles and applies new migrations, then exits. |
| `serve` | `app` | Starts the HTTP server and the mail queue worker. |
| `maintain [--once]` | `maintenance` | Runs the retention job once a day, as a separate database role. |
| `audit verify`, `audit head`, `audit check-head`, `audit export` | one-off | Checks or exports the audit log. |

## Request flow

1. The browser calls `/api/...` through `src/web/api.ts`, which sends the CSRF token on every request that is not a `GET`.
2. `buildServer` in `src/server/app.ts` refuses a body that is nested too deeply or holds characters PostgreSQL cannot store.
3. The route's gate is read. A `public` route goes straight to its handler. Any other route needs a live session, a valid CSRF token for writes, and a gate that says yes; otherwise the answer is 401 or 403.
4. The handler reads what it needs, calls pure functions in `src/lib/` to decide, and writes the result and its audit entry in one database transaction.
5. Every response gets the security headers, including the content security policy.

## Gates

Every route declares a gate by name in its config, for example `{ config: { gate: 'canRecordMoney' } }`. The names are the keys of `GATES` in `src/lib/gate.ts`. When a route is registered, the server checks it:

- a route with no gate, or a name that is not in `GATES`, stops the server starting;
- a route marked `public` that is not in `PUBLIC_ROUTES` in `src/server/app.ts` stops the start too.

Route gates answer "may this person call this at all": signed in, a verified email, two-step sign-in on, a role. Decisions about one deal or one person are further pure functions in the same file, such as `canAdministerDeal`, `canReviewDeal`, `canCommit` and `canSeePaymentInstructions`. Handlers call them with facts read from the database. A reviewer who leads, works on or receives carry from a deal fails `canReviewDeal` for it.

`npm run check:routes` builds the server without a database and prints every route with its gate.

## Business rules

Business judgement lives in `src/lib/`, as pure functions with no database or network access. Examples:

| File | What it decides |
|---|---|
| `gate.ts` | Who may see or do what. |
| `dealState.ts`, `dealLife.ts` | Which moves a deal may make between states. |
| `fees.ts`, `money.ts` | Fees, the amount to pay, and the money held for each participation. |
| `allocation.ts` | A lead's proposed amount, a full deal and the waiting list. |
| `statement.ts`, `reference.ts`, `unallocated.ts` | Bank statement imports, payment references, money not yet assigned, and the roster for Goten. |
| `eligibility.ts`, `participation.ts` | Whether a person may continue with a deal. |
| `outbox.ts` | Whether a queued mail should still go, and when to try again. |
| `regimePack.ts` | Reading a regime pack and checking its format. |
| `retention.ts` | When records are due to be removed. |

The server modules read facts, call these functions and store the result. The screens show what the server returns; the server judges every input again.

## Money

Money is stored and calculated as integer minor units (pence or cents), rates as basis points, and share prices as millionths of a currency unit ("micros"). Arithmetic is on `BigInt`; multiplication and division go through `mulDiv` and `mulDivHalfUp` in `src/lib/fees.ts`, so rounding happens only where a rule says so. Amounts typed into forms are read by `src/lib/pounds.ts` without floating point.

Bulma records money; it never moves it. Receipts and refunds are rows, and each event is applied through `applyMoney` in `src/lib/money.ts` inside the business transaction.

## Database and migrations

PostgreSQL 16. Migrations are plain SQL files in `src/store/migrations/`, numbered and applied in order by `src/store/migrate.ts` under an advisory lock. Each applied file's SHA-256 is stored, and the migration stops if a file already applied has changed. A schema change is always a new file; `npm run check:migrations` fails if a file on the base branch was changed or removed.

The migration creates two login roles besides the owner:

- `bulma_app`, used by the server, with only the grants each table needs. The audit tables, for example, allow `SELECT` and `INSERT` only.
- `bulma_maintenance`, used by the retention job, the role that removes data whose retention has ended.

## Mail outbox

Mail is never sent inside a request. `enqueue` in `src/server/outbox.ts` writes the mail to `notification_outbox` in the same transaction as the change it reports, with its body encrypted and the instance mode at that moment. A worker picks due rows one at a time and, before every attempt, decides again from current data (`decideSend` in `src/lib/outbox.ts`). A mail queued in one mode is never sent in the other. Delivery is at least once: a crash between sending and the commit sends again.

## Sandbox and real adapters

Outside services sit behind interfaces in `src/adapters/index.ts`: `Mailer`, `KycProvider`, `SignatureProvider`, `Storage` and `VirusScanner`. `selectAdapters` picks them by mode:

| Mode | Adapters |
|---|---|
| Sandbox | Fakes only, whatever is configured. Mail goes to the `sandbox_outbox` table, files are kept in memory with a size limit, and KYC, signatures and scanning are simulated. |
| Real | The adapters set up in `src/adapters/fromEnv.ts`: SMTP from `SMTP_SETTINGS_FILE`, Sumsub when all four of its settings are set, files under `STORAGE_DIR`, ClamAV at `CLAMD_HOST`. An adapter that is not configured throws when used. |

Setting these up is described in [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md).

## Regime packs

A regime pack is a JSON file that holds the eligibility steps and their order, the assessment questions, and the warning and legal texts for one regime. The two packs in `packs/` (`uk-fpo-template`, `uk-cobs-template`) hold placeholder text. `src/lib/regimePack.ts` parses a pack and checks its format; passing says nothing about whether the pack meets the rules of that regime. Stored pack versions never change: an edit is a new version. Keys of the form `uk-...-template` are kept for shipped packs, and the real mode refuses a pack that still holds placeholder text.

## Audit log

Every change writes an entry with `appendAudit` in `src/store/audit.ts`, inside the same transaction. Entries form a hash chain. See [the audit log](https://vegeta-ops.vercel.app/docs/bulma/build/security-model.md#audit-log) in the security model.
