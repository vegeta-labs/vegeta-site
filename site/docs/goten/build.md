# Run and build Goten

> Goten v1.3.1. Source: https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/build/README.md

Goten is a static single-page app with no server: React 19, TypeScript and Vite. Everything is calculated in the browser. These pages are for developers and for anyone working with an AI coding agent.

- [Run locally and deploy your own copy](https://vegeta-ops.vercel.app/docs/goten/build/run-and-deploy.md)
- [CSV reference](https://vegeta-ops.vercel.app/docs/goten/build/csv-reference.md): every column, alias and currency rule, for imports and exports.
- [Architecture](https://vegeta-ops.vercel.app/docs/goten/build/architecture.md): code layout and calculation modules.
- [Verification](https://vegeta-ops.vercel.app/docs/goten/build/verification.md): unit tests, the independent oracle, mutation tests and how to run them.

For how operations staff use the app, see [Use Goten](https://vegeta-ops.vercel.app/docs/goten.md).

## Deal data stays in the browser

The app has no backend and no account. Confirmed in the code:

- Deal state lives in a React reducer (`src/state.ts`) and is saved to the browser's `localStorage` under the key `deal-ops-toolkit:v1`, as JSON with a schema version. The theme and tour progress are kept apart under `deal-ops-toolkit:theme` and `deal-ops-toolkit:tour`.
- Nothing is sent over the network. The content security policy in `vercel.json` sets `connect-src 'none'`, and an end-to-end test records every request.
- Files are read locally with the File API. Exports are downloaded through a `Blob`, and messages are copied through the clipboard.

`localStorage` is scoped to the site's origin and is not encrypted. Anyone with access to that browser profile, or a tool that can read that browser, can read it.

## Real investor data and AI tools

Goten cannot protect data once it is copied out of the browser. If you or an agent paste real investor names, emails, amounts or bank details into an AI tool, or attach an export, a screenshot or a browser session, that data goes to that provider under their terms.

When you work with an AI coding agent:

- Use the sample deal and `fixtures/` for testing and bug reports. Do not give the agent real deal files, exports or browser sessions.
- Do not add real investor data to the repository, including as a test fixture.
- Have the agent run the checks in [Verification](https://vegeta-ops.vercel.app/docs/goten/build/verification.md) before you rely on a change.
- Keep money calculations in `src/lib` and whole-number arithmetic throughout, as described in [Architecture](https://vegeta-ops.vercel.app/docs/goten/build/architecture.md). Keep the Python oracle independent: if a rule changes, rewrite it from the written rules rather than from the TypeScript.

Limits that matter when you extend it: one currency per deal, one investment and one exit, the same terms for every investor. See the [README](https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/README.md) for scope and the [requirements](https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/01_PRD.md) for the full rule list. What each release contains is in the [release notes](https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/RELEASE_NOTES.md).
