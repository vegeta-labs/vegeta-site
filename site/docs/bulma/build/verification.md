# Verification

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/verification.md

Bulma is checked in several independent ways: unit and database tests, browser tests, an independent Python oracle for the money rules, deliberate code breakages, and a set of source checks. This page says what each one does and how to run it.

All commands run from the repository root after `npm ci`. Test results for a version are in the [release notes](https://vegeta-ops.vercel.app/docs/bulma/release-notes.md).

## Set up

The tests need Node.js, `python3` for the oracle, and a Postgres 16 server for the database tests:

```bash
docker run -d --name bulma-pg -e POSTGRES_PASSWORD=postgres -p 55433:5432 postgres:16
npm ci
npx playwright install --with-deps chromium
```

The tests connect to `postgres://postgres:postgres@localhost:55433/postgres` unless `TEST_DATABASE_URL` says otherwise. Each test file creates its own fresh, migrated database there, with the same database roles as a real instance.

## Test names

Every test name starts with the ID of the test-plan case it covers, such as `TC-AUTHZ-07` or `E2E-01`. The test plan, the written requirements and the list of names that must not be published are kept in the development repository, not in this public one; each test-plan case ends with the milestone it is due at. In the public repository the three checks that read them, `check:requirements`, `check:identity` and the due-case step of `coverage:check`, print "skipped" and pass. Every test still runs except one, which needs the private list and is skipped.

## Quick checks

```bash
npm run typecheck   # TypeScript, no output files
npm run lint        # oxlint on src, scripts and e2e; warnings fail
```

## Unit and database tests

```bash
npm test
```

Runs Vitest on `src/**/*.test.ts` and `scripts/**/*.test.ts`. This covers the pure rules in `src/lib/`, the server routes against a real Postgres database, the PDFs, the check scripts themselves, and the comparison with the Python oracle (below).

## Browser tests

```bash
npm run e2e
```

Runs Playwright in Chromium. It first makes a production build, then starts a real server (`e2e/serve.ts`) on a fresh database with the production content security policy, so a page that breaks the policy fails a test. Some tests also run at phone size. The sandbox test records every request the browser makes and fails if any goes to another host.

## Test-plan coverage

```bash
npm run coverage:check
```

Runs the unit tests and the browser tests, then `scripts/check-coverage.mjs`, which reads both JSON reports. In the development repository it fails unless every case due at the current milestone ran and passed; in the public repository it runs the tests (one is skipped, as above) and skips the due-case step. It reads the test results, not the source, so a test that exists but did not run does not count.

## The independent oracle

`scripts/oracle/` is a separate implementation of the money rules in Python, using only the standard library and exact arithmetic (integers and fractions, no floating point). It is written from the written rules alone (the requirements and test plan kept in the development repository, and `scripts/oracle/SCHEMA.md`), never from the TypeScript, and it shares no code with it. Its input and output format is in `SCHEMA.md`.

```bash
npm run oracle:selfcheck
```

Checks the oracle against values worked out by hand from the rules.

`npm test` then runs `src/lib/oracle.test.ts`, which generates cases from a fixed seed, plus boundaries near a half and near each limit, and compares the TypeScript with the oracle. It covers the platform fee, the amount to pay, commitment checks and estimates, the lead fee, scale-back and money sequences, and bank statement matching.

To stay useful, the oracle must only ever be changed from the rules.

## Mutation check

```bash
npm run mutation
```

`scripts/mutation-check.mjs` holds a list of deliberate breakages ("mutants"). Each one names a file, a piece of code that must occur in it exactly once, the broken version, what it breaks, and the test command that should catch it. For each mutant the script:

1. writes the broken version into the source file;
2. runs the tests, stopping at the first failure;
3. writes the original file back, even if the run fails.

A mutant is **caught** if the tests fail, and **SURVIVED** if they pass. Before it starts, every test suite it uses must pass unmutated; that run's time sets each mutant's limit at three times the normal time plus a minute. A mutant still running then counts as caught and is marked **TIMEOUT**, to be looked at. A mutant whose original code is no longer in its file is reported as **MISSING** and counts as a failure, not a pass. The run fails if anything survived or went missing.

**This command edits source files while it runs.** Do not run it alongside anything else that reads or changes the source, such as an editor saving files, a second test run or a review tool. If the run is killed, a mutant can be left in a file: check `git status` afterwards.

Options:

| Option | What it does |
|---|---|
| `--check-only` | Only checks that every mutant's original code is still in its file, exactly once. Takes seconds and runs no tests. |
| `--since=<ref>` | Runs only the mutants whose result can have changed since that commit: new mutants, mutants near a changed line, and mutants whose tests or test harness lost or changed a line. Run `--check-only` for the rest. |
| `--list` | Lists the mutants `--since` selects (or all of them), without running them. `MUTANTS_MATCH` is not applied. |
| `MUTANTS_MATCH=<text>` | Environment variable: runs only the mutants whose file or description contains the text. |

## Source checks

| Command | What it checks |
|---|---|
| `npm run check:routes` | Builds the server without a database and lists every route with its gate. Fails if a route names no gate or is public without being on the public list. |
| `npm run check:outbound` | No telemetry and no request to the project: searches the source in `src/` for known network calls and outside host names; only the adapter files and the browser's API client may make such calls, no source file may name an outside host except the KYC adapter's, and no known analytics package is a dependency. It does not inspect the code of dependencies. |
| `npm run check:migrations` | Migration files that exist on the base commit have not been changed or removed. Takes the base as an argument; without one it compares with the previous commit. |
| `npm run check:requirements` | Every requirement appears in the test plan. Development repository only; skipped in the public one. |
| `npm run check:licences` | Every dependency has an allowed licence, or a listed exception with its reason. |
| `npm run check:tokens` | `src/web/tokens.css` still matches the design tokens shared with the other Vegeta tools (by SHA-256). |
| `npm run check:identity` | Every file that is published names nothing that must not be published. Development repository only (the list of names is private); skipped in the public one. |

## Continuous integration

`.github/workflows/ci.yml` runs the quick checks and every source check (the migration check on pull requests), `npm audit` for high-severity issues in application dependencies, the oracle self-check and `npm run coverage:check`, then builds the image and starts it with the steps in the README. It does not run the mutation check, which is run by hand.
