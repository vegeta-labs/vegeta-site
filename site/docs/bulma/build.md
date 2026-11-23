# Run and build Bulma

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/README.md

Bulma — SPV Workspace is self-hosted software for one operator running SPV deals: a Fastify server and a PostgreSQL database, with a React app served by the same server, shipped as one Docker image. These pages are for operators who run an instance and for developers, including anyone working with an AI coding agent.

## Run an instance

- [Run locally and deploy your own copy](https://vegeta-ops.vercel.app/docs/bulma/build/run-and-deploy.md): what you need, starting it with Docker Compose, the developer setup, deploying behind HTTPS and checking your copy.
- [Configuration reference](https://vegeta-ops.vercel.app/docs/bulma/build/configuration.md): every setting the server reads, with its default and when it is needed.
- [Operator guide](https://vegeta-ops.vercel.app/docs/bulma/build/operator-guide.md): roles and the review work in the app.
- [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md): the switch from sandbox to real, sending mail, the KYC provider and the payment instructions file.
- [Upgrades and backups](https://vegeta-ops.vercel.app/docs/bulma/build/upgrade-and-backup.md): backing up, upgrading, rolling back and restoring.

## Understand and change the code

- [Architecture](https://vegeta-ops.vercel.app/docs/bulma/build/architecture.md): how the code is laid out.
- [Verification](https://vegeta-ops.vercel.app/docs/bulma/build/verification.md): the tests and checks, and how to run them.
- [Security model](https://vegeta-ops.vercel.app/docs/bulma/build/security-model.md): what the software protects, and how.

## Before you rely on it

- [Who does what](https://vegeta-ops.vercel.app/docs/bulma/build/responsibilities.md): which controls the software has, and which are yours.
- [Due-diligence note](https://vegeta-ops.vercel.app/docs/bulma/build/due-diligence.md): for anyone deciding whether to rely on this software.

For how leads and investors use an instance, see [Use Bulma](https://vegeta-ops.vercel.app/docs/bulma.md). What each release contains is in the [release notes](https://vegeta-ops.vercel.app/docs/bulma/release-notes.md).

## The sandbox comes first

A new instance is a sandbox, and it stays one until two admins switch it to the real mode. In the sandbox the server uses fakes for mail, identity checks, signing, file storage and virus scanning, whatever real services are configured. No email leaves it, and files are kept in memory and lost when the app restarts. Use made-up details everywhere.

Bulma never moves money, holds shares or runs a wallet. It has no telemetry and sends nothing to the project. The only outside services it talks to are the ones you configure for the real mode: your SMTP server, your KYC provider and your virus scanner. The ClamAV container added for the real mode updates its virus signatures from the internet. It does not take on the operator's regulatory duties.

## Real investor data and AI tools

A real instance holds names, email addresses, identity documents, amounts and payment details. Bulma cannot protect that data once it is copied out of the instance. If you or an agent paste it into an AI tool, or attach a database dump, an evidence pack, an export, a log or a screenshot, it goes to that provider under their terms.

When you work with an AI coding agent:

- Develop and report bugs against a sandbox or the test database, with made-up data. Do not give the agent a real instance, its database, its `secrets` folder, its `.env` or its backups.
- Do not add real investor data to the repository, including as a test fixture.
- Have the agent run the checks in [Verification](https://vegeta-ops.vercel.app/docs/bulma/build/verification.md) before you rely on a change.
- Keep business rules and money calculations in `src/lib/`, in whole numbers, as described in [Architecture](https://vegeta-ops.vercel.app/docs/bulma/build/architecture.md). Keep the Python oracle in `scripts/oracle/` independent: if a rule changes, rewrite it from the written requirements, not from the TypeScript.

Closing a deal is not built yet. See the [README](https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/README.md) for what is done so far.
