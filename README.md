# Vegeta website

The website of Vegeta, open-source software for SPV and syndicate operations: https://vegeta-ops.vercel.app

Goten — Deal Calculations and Trunks — Operations Inbox are the two modules.

Static pages (`site/`: the overview `/`, `/toolkit/` and `/inbox/`) with one small script (`site-src/site.js`, built to `site/site.js`). `/inbox/demo/` is the Trunks — Operations Inbox demo package from its GitHub Release, unpacked as published and locked by hash in `inbox-demo.lock` (`scripts/inbox-demo.mjs`). No analytics, no external requests; the security headers are in `site/vercel.json`. Design, components and checks are described in `docs/en/SITE_HANDBOOK.md`.

```bash
npm ci
npm run toolkit:fetch   # the public Toolkit repo at the commit in toolkit.ref (the pages quote the app word for word)
npm run inbox:fetch     # the public Inbox repo at the commit in inbox.ref (release notes, UI text, default categories)
npm run site:share      # optionally rebuild the Vegeta social card (requires Playwright Chromium)
npm run site:check      # CSP markup, links, app sentences, figures backed by release notes, demo package hashes, script build and size, source-backed step illustrations
npm run site:preview    # http://localhost:4181 with the production headers and redirects
```

Licence: Apache-2.0 (code). Fonts: SIL OFL 1.1 (`site/licenses/`). Artwork (`site/img/valley.webp`, `site/img/valley-loop.mp4`, `site/img/vegeta-share.jpg`) and the film with its stills and captions (`site/media/`) are not licensed under Apache-2.0.
