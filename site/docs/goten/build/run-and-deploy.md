# Run locally and deploy your own copy

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/build/run-and-deploy.md

## What you need

- Node.js 22, the version CI uses.
- Python 3, only for the oracle checks.

There are no environment variables and no services to set up.

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local address. Open it, click **I understand**, then **Load sample deal**.

You should see **Receipts in scope** £114,840.00 on **1. Reconciliation**. If you do, the app and its calculations are working.

## Build and preview

```bash
npm run build
npm run preview
```

`npm run build` type-checks and writes a static site to `dist/`. `npm run preview` serves that build with the same security headers as production, because `vite.config.ts` reads them from `vercel.json`. Use it to check that nothing breaks under the content security policy.

## Deploy

`dist/` is static files only. There is no server-side rendering and no routing, so any static host works.

1. Run `npm run build` and upload `dist/`.
2. Set these response headers on every path, copied from `vercel.json`: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.

Keep `connect-src 'none'` in the policy. It blocks script connections such as fetch, XHR, WebSocket and beacons. It does not stop a page navigating away, so the app also relies on having no code that sends data. Check any code you add for this.

## Check your copy

Open it and walk the [sample deal](https://vegeta-ops.vercel.app/docs/goten/use/getting-started.md). The figures should match that page. Then check the headers:

```bash
curl -sI https://your-domain/ | grep -i -E 'content-security|nosniff|referrer|permissions'
```

Your copy has its own saved data, separate from any other copy, because browser storage is per origin.

## Before you use it for real deals

- The footer's **Send feedback** link goes to the form set in `FEEDBACK_FORM_URL` in `src/config.ts`. Point it at your own form.
- The storage keys are `goten:v1`, `goten:theme` and `goten:tour` (`src/state.ts`, `src/theme.ts`, `src/tour/progress.ts`). If you rename them, data saved under the old names is no longer read unless you also migrate it.
- Check that the disclaimer and privacy text in `src/config.ts` still hold for your deployment.
- Consider who hosts it. The host receives normal page requests but no deal data.

## When it goes wrong

| Problem                                                | What to do                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` warns about install scripts for fsevents | Safe to ignore; the optional package is not needed to run the app.                                                                 |
| The page loads but is blank on your host               | Check the browser console. A stricter or missing policy, or an asset path issue, shows up as a CSP or 404 error.                   |
| Figures differ from the sample on the page             | Something was edited on the page, or the code changed. **Load sample deal**, or run the checks in [Verification](https://vegeta-ops.vercel.app/docs/goten/build/verification.md). |
| A port is in use                                       | Run `npm run dev -- --port 5180`, or any free port.                                                                                |
