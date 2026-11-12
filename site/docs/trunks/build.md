# Trunks — Operations Inbox: run and build (administrator documentation)

> Trunks v0.5.0. Source: https://github.com/vegeta-labs/trunks/blob/7b32c954f7017b87fa3686d72b3a303048fd018b/docs/en/README.md

Trunks is the Operations Inbox product in Vegeta, software for SPV and syndicate operations teams. It is an open-source, self-hosted, **read-only** email agent for investment-operations inboxes. For each
inbound email it:

- picks a category
- extracts the key facts
- links the email to deals and people in your directory
- flags risk
- prepares a reply from a fixed template for a person to check, copy and send from their own mail client.

It never sends email. It never moves money. It never changes your business records.

| Document | What it covers |
|---|---|
| [Quick start](https://vegeta-ops.vercel.app/docs/trunks/build/quickstart.md) | The demo, then a real deployment with Docker Compose |
| [Deploy with an AI coding assistant](https://vegeta-ops.vercel.app/docs/trunks/build/deploy-with-ai.md) | A prompt for the demo, and which steps of a real deployment a person does |
| [Users and directory](https://vegeta-ops.vercel.app/docs/trunks/build/users-and-directory.md) | Creating users and importing deals, commitments, bank lines, ledger and contacts (API with `curl`; no screen yet) |
| [Mailboxes](https://vegeta-ops.vercel.app/docs/trunks/build/mailboxes.md) | IMAP, `.eml` import, Gmail, Microsoft 365: permissions and set-up |
| [Models and data protection](https://vegeta-ops.vercel.app/docs/trunks/build/models-and-data-protection.md) | Model providers, the start-up checks, what a model sees and what it never does |
| [Accounts in payment messages](https://vegeta-ops.vercel.app/docs/trunks/build/payment-messages.md) | When the accounts in an MT103 or pacs.008 do not count as a bank details change, and the limits |
| [Configuration reference](https://vegeta-ops.vercel.app/docs/trunks/build/configuration.md) | Every key of `deployment.yaml`, `cases.yaml` and `templates.yaml` |
| [Security model](https://vegeta-ops.vercel.app/docs/trunks/build/security-model.md) | Read-only guarantees, containers, database roles, audit chain, encryption, fraud rules, known limits |
| [DPIA template](https://vegeta-ops.vercel.app/docs/trunks/build/dpia-template.md) | A data protection impact assessment template for the deploying organisation (UK GDPR) |
| [LIA template](https://vegeta-ops.vercel.app/docs/trunks/build/lia-template.md) | A legitimate interests assessment template for the deploying organisation (UK GDPR) |
| [Retention](https://vegeta-ops.vercel.app/docs/trunks/build/retention.md) | Default retention periods, how deletion works, the hold flag, KYC transfer and replacement |
| [Backup and upgrade](https://vegeta-ops.vercel.app/docs/trunks/build/backup-and-upgrade.md) | What to back up, restoring, upgrades, key rotation |

All examples use fictional data and `.example` domains.
