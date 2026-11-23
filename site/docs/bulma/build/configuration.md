# Configuration reference

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/configuration.md

Bulma is configured by environment variables, secret files and a few JSON files. Most settings are made in the app by an admin; this page covers what the server reads when it starts.

General rules:

- **Secrets come from files.** A setting ending in `_FILE` holds the path of a file, and the server reads the value from that file. A trailing line break is ignored. Compose mounts the files in `secrets` under `/run/secrets/`.
- **With Compose, settings go in `.env`.** Compose reads it on every command and passes the settings below to the services. Paths in `.env` for the `_FILE` settings are paths inside the container.
- **The sandbox ignores the real services.** In the sandbox the server uses fakes for mail, identity checks, signing, file storage and virus scanning, whatever is configured. Settings marked *real mode* below only take effect after the switch, but they are read and checked at every start: an unreadable file or a partial setting stops the start in the sandbox too.
- **Most wrong or missing settings stop the start**, with a message that names the setting.

## Settings for Compose

These are read by `docker-compose.yml`, not by the server.

| Setting | Default | What it does |
|---|---|---|
| `BULMA_UID`, `BULMA_GID` | `10001` | The user and group the containers run as. Set them to your own (`id -u`, `id -g`), so the app can read the secret files that only you can read. |
| `BULMA_VERSION` | `local` | The tag of the image `bulma-deal-room` that the services use. |
| `COMPOSE_FILE` | `docker-compose.yml` | Docker Compose's own setting. Set it to `docker-compose.yml:deploy/compose.real.yml` to add the real-mode extras: see [the payment instructions file](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md#the-payment-instructions-file). |

## Database

| Setting | Default | Required | Read by | What it does |
|---|---|---|---|---|
| `DATABASE_HOST` | `db` | no | all commands | Host of the PostgreSQL server. |
| `DATABASE_PORT` | `5432` | no | all commands | Its port. Compose does not pass it. |
| `DATABASE_NAME` | `bulma` | no | all commands | The database. |
| `POSTGRES_PASSWORD_FILE` | none | for `migrate` | `migrate` | Password of the `postgres` user. Migrations run as this user and create the two roles below. |
| `BULMA_APP_DB_PASSWORD_FILE` | none | yes | `migrate`, `serve`, `audit` | Password of the `bulma_app` role, which the app uses. |
| `BULMA_MAINTENANCE_DB_PASSWORD_FILE` | none | for `migrate` and `maintain` | `migrate`, `maintain` | Password of the `bulma_maintenance` role, which only the expiry job uses. |

## Keys

| Setting | Default | Required | Read by | What it does |
|---|---|---|---|---|
| `BULMA_MASTER_KEYS_FILE` | none | yes | `serve`, `audit` | The master keys that encrypt stored data, as `id:<base64>`, several separated by commas. Each key is 32 bytes. |
| `BULMA_ACTIVE_KEY` | the last key in the list | no | `serve`, `audit` | The id of the master key used for new data. Compose does not pass it. |
| `BULMA_HMAC_KEY_FILE` | none | yes | `serve`, `audit`, `maintain` | The key that signs the audit log, in base64, at least 32 bytes. The expiry job gets this key and no master key. |

`init-secrets` writes one master key with the id `k1`, and the HMAC key. Without these keys a backup cannot be verified or read: see [Upgrades and backups](https://vegeta-ops.vercel.app/docs/bulma/build/upgrade-and-backup.md).

## The app

| Setting | Default | Required | Mode | What it does |
|---|---|---|---|---|
| `INITIAL_ADMIN_EMAIL` | none | on the first start | both | Email of the first admin. Used only while the database has no account. |
| `INITIAL_ADMIN_PASSWORD_FILE` | none | on the first start | both | That admin's password. `init-secrets` writes it to `secrets/initial_admin_password`. |
| `INSECURE_COOKIES` | not set | no | both | `1` lets the session cookie work over plain `http://`. Only for a trial on your own machine. |
| `TRUST_PROXY` | not set | behind a proxy | both | The address or CIDR of your HTTPS proxy, several separated by commas, for example `172.30.0.1`. The app then takes the visitor's address from the proxy. Host names are refused. If it is not set and `INSECURE_COOKIES` is not `1`, the app warns at start. |
| `PUBLIC_URL` | not set | in the real mode | real | The address people reach the app on. Links in mail are built from it. The real mode does not start without it. |
| `PORT` | `8080` | no | both | The port the server listens on. Compose does not pass it, and its health check and published port expect 8080. |
| `WEB_ROOT` | `dist/web` | no | both | The folder of the built web app. |
| `STORAGE_DIR` | not set for `serve`; `/var/lib/bulma/files` for `maintain` | in the real mode | real | Where uploaded files are kept, encrypted. Compose sets `/var/lib/bulma/files`, on the `files` volume. In the sandbox, files are held in memory, up to 256 MiB, and lost on restart. |
| `PAYMENT_INSTRUCTIONS_FILE` | not set | to switch to the real mode | both | The JSON file with your payment instructions. See [the payment instructions file](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md#the-payment-instructions-file). |

## Outside services (real mode)

The server connects to nothing else and has no telemetry; `npm run check:outbound` searches the source for network calls and outside hosts outside the adapters (see [Verification](https://vegeta-ops.vercel.app/docs/bulma/build/verification.md#source-checks)). Compose passes the paths of the files below but mounts none of them: mount each file as a secret for the `app` service, for instance in `deploy/compose.real.yml`. Compose does not pass `CLAMD_PORT`.

| Setting | Default | What it does |
|---|---|---|
| `SMTP_SETTINGS_FILE` | not set | A JSON file `{host, port, secure, user?, from}` for your SMTP server. Without it, steps that send a link are refused in the real mode. See [sending mail](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md#sending-mail). |
| `SMTP_PASSWORD_FILE` | not set | The SMTP password, in its own file. Set without `SMTP_SETTINGS_FILE`, it stops the start. |
| `SUMSUB_APP_TOKEN_FILE`, `SUMSUB_SECRET_KEY_FILE`, `SUMSUB_WEBHOOK_SECRET_FILE`, `SUMSUB_LEVEL_NAME` | not set | The Sumsub identity check. Set all four or none: a partial setting stops the start. `SUMSUB_LEVEL_NAME` is the value itself, not a file. See [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md). |
| `CLAMD_HOST` | not set | Host of a ClamAV daemon that scans uploads. `deploy/compose.real.yml` sets it to its `clamav` service. Without it, the real mode refuses every upload. |
| `CLAMD_PORT` | `3310` | Its port. |

In the real mode, an outside service that is not configured is refused when it is first needed, with a message naming it.

## Regime packs

A regime pack holds the steps an investor goes through, the thresholds, the assessment questions and the legal texts. The packs shipped with the software are in `packs/`: `uk-fpo-template` (the default for a new instance) and `uk-cobs-template`. Their texts are placeholders, not legal text, and no lawyer has reviewed them.

- **Shipped packs are loaded at every start.** A new version is added. A stored version whose file changed stops the start, so do not edit the files in `packs/`.
- **Add your own pack in the app.** An admin pastes the JSON under **Regime packs** on **Home** and clicks **Check and add**. It is checked against the pack format, and a pack that does not load is refused with the reasons. Then **Ask to activate**.
- **Give it its own name.** A `key` of the form `uk-...-template` is kept for shipped packs and refused. A key is lower-case letters, digits and `-`, starting with a letter. The `regime` is `uk-fpo` or `uk-cobs`, and a pack cannot change regime between versions.
- **The real mode needs your own active pack** with no placeholder text left: see [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md).

Start from a copy of a shipped `pack.json`. The format is checked by `src/lib/regimePack.ts`.

## Commands

The image runs `node --experimental-strip-types src/main.ts` with one of these commands. Compose runs `migrate`, `serve` and `maintain` as services.

| Command | What it does |
|---|---|
| `init-secrets <dir>` | Writes the six secret files to `<dir>`, keeping any that exist. |
| `migrate [--roles-only]` | Runs the migrations, which only go forward. `--roles-only` creates the database roles only, for a restore. |
| `serve` | Starts the app. |
| `maintain [--once]` | The expiry job: removes personal data whose retention has ended, at start and then once a day. `--once` runs one round. |
| `audit verify`, `audit head`, `audit check-head <seq> <hash>`, `audit export` | Checks the audit log, prints its head, compares it with a saved head, or writes the whole log to standard output. |
