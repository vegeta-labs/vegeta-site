# Security model

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/security-model.md

This page describes what Bulma does to limit harm, and where its limits are. It does not replace your own security assessment, and nothing in it means an instance meets the operator's legal duties or is safe by itself.

To report a vulnerability, see [SECURITY.md](https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/SECURITY.md). Which controls are the software's and which are yours is in [who does what](https://vegeta-ops.vercel.app/docs/bulma/build/responsibilities.md).

## What it never does

- It never moves money, holds shares or runs a wallet. Money is recorded by a person after it happened at the bank.
- It has no telemetry and sends nothing to the project.
- In the sandbox, no email leaves, and there is no way to type in the payment instructions investors pay to: they come only from a file at the switch. An investor can enter their own bank account for refunds in any mode, so use made-up details in the sandbox.

## Sign-in and sessions

| Control | How |
|---|---|
| Passwords | Stored as argon2id hashes. At least 12 characters. An account an admin creates starts with a temporary password that must be changed before anything else. |
| Failed sign-ins | Counted per network address and per email in a 15-minute window; after 10 failed attempts, more are refused until the window ends. Unknown user, wrong password and too many attempts get the same answer. |
| Two-step sign-in | Time-based one-time codes, with ten recovery codes shown once. Each code works once. The secret is stored encrypted. Turning it on ends the account's other sessions. |
| Session cookie | A random token in an `HttpOnly`, `SameSite=Strict` cookie, marked `Secure` unless `INSECURE_COOKIES=1`. It lasts 12 hours. The database keeps only an HMAC of the token. |
| Ending sessions | Changing the password or turning on two-step sign-in raises the account's credential version, which ends older sessions. Disabling an account deletes its sessions. Links issued before a credential change stop working. |
| CSRF | Every request that is not a `GET` must carry a token derived from the session, compared in constant time. |

Behind a reverse proxy, set `TRUST_PROXY` to the proxy's address. Without it every visitor shares one address, and ten failed sign-ins lock out everyone: see [Try it](https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/README.md#try-it).

## Roles and access

There are three staff roles: admin, reviewer and approver. A role counts only once its holder has a proven email address, a password that is not temporary, and two-step sign-in turned on. Leads and investors have no role; they need a signed-in account with a proven email address.

Access to one deal is decided again for that deal. A reviewer or approver who leads, works on or receives carry from a deal, or is in its syndicate, cannot review or approve it. In the real mode, role changes and some other changes wait for a second admin: see [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md).

## Gates

Every route names a gate from `src/lib/gate.ts`, and the gates deny by default. A route that names no gate, or is marked public without being on the server's public list, stops the server starting. `npm run check:routes` lists every route with its gate. See [Gates](https://vegeta-ops.vercel.app/docs/bulma/build/architecture.md#gates) in the architecture page.

## Browser protections

Every response carries these headers:

- a content security policy that allows scripts, styles, images, fonts and connections from the same origin only, with no inline scripts or styles, no plugins and no framing of the app (`frame-ancestors 'none'`);
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

The only exception an operator can add is framing a deck from named sites, over HTTPS. The browser tests run against a production build with this policy, so a page that breaks it fails a test.

The server also limits a JSON body to 2 MB and an uploaded file to 15 MB (100 MB for a deal's legal documents), refuses bodies nested more than 64 levels or holding characters Postgres cannot store, and gives a request at most three minutes to arrive. Its log records method, path and status only: never bodies, cookies or query strings.

## What is stored

Everything is in your Postgres database and, in the real mode, your file directory. The sandbox keeps files in memory, and they are gone after a restart.

- **Encryption.** Uploaded files, queued mail bodies, two-step secrets and some link tokens are encrypted with AES-256-GCM, each with its own data key wrapped by a master key. Master keys have IDs, so a new one can be added while old data stays readable.
- **Lookups.** Sign-in throttling, sessions, CSRF tokens and recovery codes use HMAC-SHA256 with a separate key, so the raw values are not stored.
- **Not encrypted.** Other records, such as names, email addresses, deal terms, amounts and investors' bank account details, are ordinary database rows. Protect the database, its backups and the `secrets/` folder: see [Upgrades and backups](https://vegeta-ops.vercel.app/docs/bulma/build/upgrade-and-backup.md).
- **Retention.** The `maintenance` service removes personal data when its retention period ends, using its own database role, the only one allowed to delete that data. It gets the HMAC key but not the master keys.

## Database roles and containers

The server connects as `bulma_app`, which has only the grants each table needs: the audit tables allow reading and adding, not changing. Migrations run once at start as the database owner, then exit.

In `docker-compose.yml`, the application containers run as a non-root user with a read-only root file system, drop all Linux capabilities and set `no-new-privileges`. The app's port is published on `127.0.0.1` only; HTTPS in front of it is yours to provide.

## Audit log

Every change writes an audit entry in the same transaction as the change.

- Entries form a hash chain: each holds the hash of the one before, the software version and the active pack version.
- The audit row holds IDs and an HMAC of the detail. Personal details go in a separate table, which can be deleted when its retention ends; the row stays, and the chain still checks.
- Database triggers refuse any update or deletion of audit rows, and any update of their detail.
- `audit verify` walks the chain and checks every detail still present against its HMAC. `audit head` prints the latest entry so you can keep it elsewhere, and `audit check-head` compares the database with it later. See [Upgrades and backups](https://vegeta-ops.vercel.app/docs/bulma/build/upgrade-and-backup.md).

A hash chain shows that the log was changed; it cannot stop someone with full database access from rewriting it. Keeping an exported head outside the instance is what makes that visible.

## Outbound requests

The server makes outbound connections only through the adapters, and only in the real mode, to services you configure: your SMTP server, Sumsub for KYC if you set it up, and your ClamAV scanner. The KYC webhook is accepted only with a valid HMAC-SHA256 or SHA-512 signature.

`npm run check:outbound` searches the source in `src/` for known network calls and outside host names. It fails if one appears outside the adapter files and the browser's API client, if a host other than the KYC provider's API is named, or if a known analytics package is added. It does not inspect the code of dependencies. A browser test records every request the pages make and fails if one leaves the app's own address.

## Sandbox by default

A new instance is a sandbox. It always uses fake adapters, whatever is configured: mail is kept in a table you can read under **Sandbox outbox**, and KYC, signatures and virus scanning are simulated. A mail queued in the sandbox is never sent, even after the switch. The switch to the real mode needs a second admin, and there is no way back. See [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md).

## What the operator is responsible for

The software records what people state and decide; it does not check that those statements are true. You are responsible for, among other things:

- HTTPS, the reverse proxy and `TRUST_PROXY`;
- the host, Docker, Postgres and their updates;
- keeping `secrets/`, the database and backups safe;
- making sure each admin and reviewer account belongs to a different real person;
- the SMTP server, the KYC provider contract and the virus scanner in the real mode;
- everything in [who does what](https://vegeta-ops.vercel.app/docs/bulma/build/responsibilities.md) and the [due-diligence note](https://vegeta-ops.vercel.app/docs/bulma/build/due-diligence.md).
