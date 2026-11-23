# Run locally and deploy your own copy

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/run-and-deploy.md

This page starts a Bulma instance with Docker Compose, sets up a machine for development, and explains how to deploy and check your own copy. A new instance is always a sandbox, with fictional data and no email leaving it.

There is no published image, so you build it from this repository.

## What you need

| Need | Notes |
|---|---|
| Docker with Compose v2 | To run an instance. The image is built on Node.js 22 and the database is PostgreSQL 16. |
| Node.js 22 or later | Only to develop or run the tests. CI uses Node.js 22. |
| Python 3 | To run the tests: `npm test` includes the oracle checks, which call `python3`. Not needed to run an instance. |

## Start an instance

Run these from the repository root.

```
docker compose build
mkdir -m 700 secrets && docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/secrets:/out" bulma-deal-room:local init-secrets /out
printf 'BULMA_UID=%s\nBULMA_GID=%s\nINITIAL_ADMIN_EMAIL=you@deals.example\nINSECURE_COOKIES=1\n' "$(id -u)" "$(id -g)" > .env
docker compose up -d
```

1. `docker compose build` builds the image `bulma-deal-room:local`. One image serves every service.
2. `init-secrets` writes six files to `secrets`: the database passwords, the master key, the HMAC key and the first admin's password. It never overwrites a file that exists. Create the folder yourself first, so that it belongs to you and only you can read it.
3. `.env` holds the settings. Compose reads it on every command, so every later command runs with the same settings. It is left out of Git. See [Configuration](https://vegeta-ops.vercel.app/docs/bulma/build/configuration.md) for every setting.
4. `docker compose up -d` starts four services: `db` (PostgreSQL), `migrate` (runs the database migrations, then stops), `app` (the web app) and `maintenance` (removes personal data when its retention ends, once a day).

Open http://127.0.0.1:8080 and sign in with that email and the password in `secrets/initial_admin_password`. You are asked to change that password first. Then turn on two-step sign-in: a role works only once its holder has it.

`INSECURE_COOKIES=1` lets the browser sign in over plain `http://`. Use it only for a trial on your own machine.

### What you should see

| Check | Expected |
|---|---|
| `docker compose ps` | `app` is healthy; `migrate` has exited. |
| `docker compose logs migrate` | `migrations applied:` followed by the migrations, or `none` on a later start. |
| `docker compose logs app` | `initial admin: created` on the first start, `initial admin: exists` after that. |
| `curl -s http://127.0.0.1:8080/api/health` | `{"ok":true}` |
| Any page in the browser | The banner **Sandbox: fictional data only. No email leaves this instance and nothing here is a real offer.** |

If you see all of these, the instance is working. From here, [Use Bulma](https://vegeta-ops.vercel.app/docs/bulma.md) and the [Operator guide](https://vegeta-ops.vercel.app/docs/bulma/build/operator-guide.md) take over.

### Stop and start again

`docker compose stop` stops the services and keeps the data. `docker compose up -d` starts them again. The database and the stored files are in the named volumes `db` and `files`. In the sandbox, uploaded files are held in memory and are gone after a restart.

`docker compose down -v` deletes the volumes, and with them every account and deal. The next `docker compose up -d` creates an empty sandbox again, with the first admin from `.env` and `secrets`.

## Develop

The tests need a PostgreSQL 16 database. They use `TEST_DATABASE_URL`, which defaults to `postgres://postgres:postgres@localhost:55433/postgres`, so this container fits:

```
docker run -d --name bulma-pg -e POSTGRES_PASSWORD=postgres -p 55433:5432 postgres:16
npm ci
npx playwright install --with-deps chromium
npm test
npm run coverage:check
```

`npm test` runs the unit and database tests. `npm run coverage:check` runs them again with the browser tests and, in the development repository, checks that every test case due at the current milestone ran and passed (the test plan is not in the public repository, so there it only runs the tests). The browser tests build the app and start their own server, on a fresh database, on port 4318. Set `E2E_PORT` to use another port. [Verification](https://vegeta-ops.vercel.app/docs/bulma/build/verification.md) lists the other checks.

## Build

```
npm run build
```

This builds the React app into `dist/web`. The server is not compiled: Node.js runs the TypeScript in `src/` directly (`node --experimental-strip-types src/main.ts`), as the image does. `npm run typecheck` checks the types.

The image is built in two stages. The second keeps only the production dependencies, `dist`, `src`, `packs` and `assets`. `secrets`, `config/local` and `docs` are never copied in.

## Deploy your own copy

Any machine that runs Docker Compose will do. The server listens on port 8080, which Compose publishes on `127.0.0.1` only, so nothing outside the machine reaches it directly.

1. Build and start it as above, with a real email for `INITIAL_ADMIN_EMAIL`.
2. Put a reverse proxy with HTTPS in front of `127.0.0.1:8080`.
3. In `.env`, remove `INSECURE_COOKIES`, so the session cookie is sent over HTTPS only.
4. In `.env`, set `TRUST_PROXY` to the address or CIDR your proxy connects from, as the app sees it (for example `TRUST_PROXY=172.30.0.1`). Docker chooses the addresses of the Compose network `backend`; for a proxy on the host, use that network's gateway, which `docker network inspect` shows. Without it, every visitor shares one address and ten failed sign-ins lock out everyone. The app warns at start when it is not set.
5. Set `PUBLIC_URL` to the address people use. Links in mail are built from it, and the real mode does not start without it.
6. Before the switch to the real mode, add `COMPOSE_FILE=docker-compose.yml:deploy/compose.real.yml` to `.env`. It adds the ClamAV virus scanner, which the real mode uses for every upload, and mounts the payment instructions file. The switch does not check for the scanner: without it, every upload is refused after the switch. See [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md).
7. Run `docker compose up -d` again.

The application containers run as your user (`BULMA_UID` and `BULMA_GID`), with a read-only file system, no Linux capabilities and no new privileges.

Before you take real deals, read [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md), [Who does what](https://vegeta-ops.vercel.app/docs/bulma/build/responsibilities.md) and the [Due-diligence note](https://vegeta-ops.vercel.app/docs/bulma/build/due-diligence.md). Set up backups before you need them: see [Upgrades and backups](https://vegeta-ops.vercel.app/docs/bulma/build/upgrade-and-backup.md). It does not take on the operator's regulatory duties.

## Check your copy

```
curl -s https://your-domain/api/health
curl -sI https://your-domain/ | grep -i -E 'content-security|nosniff|referrer|x-frame'
docker compose run --rm -T app audit verify
```

- The health check answers `{"ok":true}`.
- Every response carries `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `X-Frame-Options: DENY`. Check that your proxy keeps them.
- `audit verify` checks the audit log's chain and prints `{"ok":true,"count":...}`. Any other answer means the log does not match.
- Sign in over HTTPS from another machine, and check that the browser keeps you signed in.

## When it goes wrong

| Problem | What to do |
|---|---|
| `init-secrets` cannot write to `secrets` | Docker created the folder as root. Remove it, run `mkdir -m 700 secrets` yourself, then run `init-secrets` again. |
| `app` stops with `INITIAL_ADMIN_EMAIL and the initial admin password file are required on first start` | Set `INITIAL_ADMIN_EMAIL` in `.env` and check that `secrets/initial_admin_password` exists. |
| `app` stops with `TRUST_PROXY must be the address or CIDR of your proxy` | Give one or more IP addresses or CIDRs, separated by commas. Host names are not accepted. |
| `app` stops with `PUBLIC_URL is required in the real mode` | Set `PUBLIC_URL` in `.env`. |
| `app` stops with `built-in pack ... changed` | A shipped pack file in `packs/` was edited without a new version. Put it back, and add your own pack in the app instead. |
| Sign-in does not stick over `http://` | Without `INSECURE_COOKIES=1` the session cookie is marked for HTTPS only, and the browser may not keep it. Use HTTPS, or set it for a trial on your own machine. |
| Port 8080 is in use | Change the published port in `docker-compose.yml`, for example `'127.0.0.1:8090:8080'`. |
