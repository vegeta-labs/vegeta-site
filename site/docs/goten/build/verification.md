# Verification

> Goten v1.3.1. Source: https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/build/verification.md

Goten's calculations are checked in several independent ways. All the commands below run from the repository root after `npm install`. CI on the public repository runs everything except the mutation tests and benchmarks.

The [test plan](https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/04_TEST_PLAN.md) lists every case with a hand-worked sample deal. The commands read the test IDs in test names and report by them.

## Quick checks

```bash
npm run typecheck
npm run lint
npm run check:tokens
```

## Unit tests

```bash
npm test
```

Runs the Vitest suite in `src/`, including the comparison with the Python oracle, so it needs `python3`. Expect 445 tests to pass and 1 to be skipped: the benchmark, which runs only on request.

Test names start with their case ID, such as `TC-REC-12`.

## Test-plan coverage

```bash
npm run coverage:check
```

Runs the unit tests and then `scripts/check-coverage.mjs`, which reads the JSON report and fails unless every case due at the current milestone actually ran and passed. It does not search the source text. The current milestone is in `docs/milestone.txt`. Expect `milestone M6: 205 cases due, 205 passed`.

## The independent oracle

`scripts/oracle/` is a separate Python implementation written from the written rules alone, using only the standard library. It does not share code with the TypeScript. Its case format is in [SCHEMA](https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/scripts/oracle/SCHEMA.md).

```bash
npm run oracle:selfcheck
```

Checks the oracle against the hand calculations in the test plan. Expect `selfcheck: 178 passed, 0 failed`.

`npm test` then runs the TypeScript engines and the oracle on the hand-calculated cases and on 1,800 generated cases, and compares them field by field.

To stay useful, the oracle must be changed only from the rules, never by reading the TypeScript.

## End-to-end tests

```bash
npx playwright install chromium   # once
npm run e2e:check
```

Runs Playwright in Chromium, at default and phone sizes, against a production build served with the production headers, so a content security policy problem fails a test. It then fails unless every due end-to-end case ran and passed. Expect 33 tests covering 12 of 12 cases.

These tests also record every network request, to confirm that only the site's own static files are loaded.

`npm run e2e` runs the tests without the coverage check.

## Mutation tests

```bash
npm run mutation
```

`scripts/mutation-check.mjs` deliberately breaks the code in 276 places, one at a time, and runs the whole unit suite after each. A test must fail each time.

- **It takes a long time.** Each mutant runs the full unit suite, about 10 seconds here, so allow 45 minutes or more for the full run.
- **It edits source files.** Run it on a clean working tree, and do not run anything else against that tree at the same time. If you interrupt it, the file it was working on is left broken: run `git status` and restore that file.
- **`MISSING` means the pattern is gone**, because the code changed. It counts as a failure: update or retire that mutant.
- To run only the mutants for some files:

```bash
npm run mutation -- --files=src/lib/money.ts
```

## Benchmarks

```bash
npm run bench
```

Times the engines at the size limits and writes the results to `docs/perf.md`, so restore that file if you did not mean to record a new run. It fails if a time exceeds its target; the reconciliation target is close enough to the current timing that it can fail on a busy machine.

## Checking a change

1. `npm run typecheck`, `npm run lint`, `npm run coverage:check` and `npm run oracle:selfcheck`.
2. `npm run e2e:check` if a screen changed.
3. Walk the [sample deal](https://vegeta-ops.vercel.app/docs/goten/use/getting-started.md) by hand if a figure could have changed: £114,840.00 of receipts, £100,395.00 invested, £57,021.00 of carry and £328,479.00 to investors.
4. `npm run mutation -- --files=<changed files>` for a calculation change, and the full run before you rely on it.

If a rule changes, update the requirements first, then the code, the tests and, separately, the oracle.
