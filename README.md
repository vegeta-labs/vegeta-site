# Vegeta website

The website of Vegeta, open-source software for SPV and syndicate teams: https://vegeta-ops.vercel.app

The modules: Bulma — SPV Workspace, Goten — Deal Calculations and Trunks — Operations Inbox.

Static pages (`site/`: the overview `/`, `/bulma/`, `/goten/`, `/trunks/`, the blog `/blog/` and each module's docs under `/docs/`) with one small script (`site-src/site.js`, built to `site/site.js`). `/trunks/demo/` is the Trunks — Operations Inbox demo package from its GitHub Release, unpacked as published and locked by hash in `trunks-demo.lock` (`scripts/trunks-demo.mjs`). No analytics, no external requests; the security headers are in `site/vercel.json`. Design, components and checks are described in `docs/en/SITE_HANDBOOK.md`.

```bash
npm ci
npm run goten:fetch   # the public Goten repo at the commit in goten.ref (the pages quote the app word for word)
npm run trunks:fetch     # the public Trunks repo at the commit in trunks.ref (release notes, UI text, default categories)
npm run bulma:fetch      # the public Bulma repo at the commit in bulma.ref (release notes, UI text, the documents the page quotes)
npm run docs:fetch       # each module's docs at the pin in site-src/docs.json (the /docs/ pages)
npm run site:share      # optionally rebuild the Vegeta social card (requires Playwright Chromium)
npm run site:check      # CSP markup, links, app sentences, figures backed by release notes, demo package hashes, script build and size, source-backed step illustrations
npm run site:preview    # http://localhost:4181 with the production headers and redirects
```

Licence: Apache-2.0 (code). Fonts: SIL OFL 1.1 (`site/licenses/`). Artwork (`site/img/valley.webp`, `site/img/valley-loop.mp4`, `site/img/vegeta-share.jpg`) and the film with its stills and captions (`site/media/`) are not licensed under Apache-2.0.
