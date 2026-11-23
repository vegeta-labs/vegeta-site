# What the real mode asks for

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/real-mode.md

The instance stays a sandbox until all of this is in place. The switch page lists what is still missing. A second admin approves the switch, and there is no way back to the sandbox. Everything done in the sandbox stops counting at that moment: statements, assessments, warnings, waiting periods, identity checks, investing entities and their files. People without a role confirm their address again. The rows stay until retention removes them. This software does not take on the operator's regulatory duties: get your own legal advice first.

- A regulatory status. An appointed representative cannot use this version.
- The name of the operator accountable person and the date they confirmed. This is what the operator writes; it does not mean a lawyer has looked at anything.
- An active pack of your own, with no placeholder text left. Give it its own name: names like `uk-...-template` are kept for packs shipped with the software.
- Two admins and a reviewer, three different people, and at least one promotion approver.
- Payment instructions, from a file.

Once in the real mode, every change of role, and disabling anyone who holds a role, waits for a second admin. Shortening how long things are kept, and lifting a retention hold, wait for a second admin too, because deletion cannot be undone. That includes emergencies: if you need to cut someone off at once, both admins must be reachable, or you must stop the app.

A real instance sends mail through your own SMTP server: see [sending mail](#sending-mail). Without it, registration, password resets and other steps that send a link are refused.

Set `PUBLIC_URL` to the address people reach the app on: links in mail are built from it, and the app will not start in the real mode without it.

For KYC through Sumsub, sign your own contract, mount its secrets (add them under `secrets:` for the `app` service, for instance in `deploy/compose.real.yml`) and set `SUMSUB_APP_TOKEN_FILE`, `SUMSUB_SECRET_KEY_FILE`, `SUMSUB_WEBHOOK_SECRET_FILE` and `SUMSUB_LEVEL_NAME` in `.env`; Compose passes them through. Set all four or none: a partial setting stops the start. Point the webhook at `/api/kyc/webhook/sumsub` with HMAC-SHA256 or SHA-512. A result always goes to a reviewer; it decides nothing by itself. People can always choose the manual route, without a face scan. The person continues on Sumsub's own page through a link, which also opens on a phone. When a person's data reaches the end of retention, the job removes it here; removing the applicant at Sumsub is yours, under your contract, and the audit log records the applicant id to follow up.

A secret needs two entries in `deploy/compose.real.yml`: one under the `app` service and one at the top level that names its file. For example, for the Sumsub token:

```yaml
services:
  app:
    secrets: [sumsub_app_token]
secrets:
  sumsub_app_token:
    file: ./secrets/sumsub_app_token
```

The file is then at `/run/secrets/sumsub_app_token` inside the container, so `.env` has `SUMSUB_APP_TOKEN_FILE=/run/secrets/sumsub_app_token`. Do the same for each secret file. Paths are relative to the project folder, as for the other files in `deploy/compose.real.yml`; Compose merges these lists with the ones in `docker-compose.yml`.

## Sending mail

Mail goes through an SMTP server you choose. Put the settings in a JSON file and the password in a file of its own, mount both as secrets like the KYC ones, and set `SMTP_SETTINGS_FILE` and `SMTP_PASSWORD_FILE` in `.env`.

```json
{ "host": "smtp.deals.example", "port": 587, "secure": false, "user": "bulma@deals.example", "from": "deals@deals.example" }
```

`secure: true` uses TLS from the start (usually port 465). With `secure: false`, STARTTLS is required: mail is never sent in plain text. `user` is optional. A password file without a settings file stops the start.

Mail waits in a queue in the database and is tried again if the server does not take it. Before each try the app checks again whether it should still go, so a reminder for a step already done is not sent. The sandbox never sends mail.

## The payment instructions file

Nobody can type in the payment instructions investors pay to, so they come from a file you mount. They enter the database only when the second admin approves the switch; that admin sees them first. Do not change the file between asking and approving, or the approval is refused.

```json
[
  {
    "currency": "GBP",
    "account_fields": { "sort_code": "11-22-33", "account_number": "12345678" },
    "holder": "Example Client Money Ltd",
    "holder_capacity": "Regulated client money provider",
    "holder_frn": "123456",
    "asserted_client_money": true,
    "your_money_text_key": "your_money",
    "refund_days": 10,
    "receipt_check_note": "Checked against the bank statement each morning."
  }
]
```

There is one entry per currency. `holder_frn` may be `null`. `your_money_text_key` names a legal text in the active pack that is not a placeholder. The software records these values and does not judge them.

Mount it by adding `COMPOSE_FILE=docker-compose.yml:deploy/compose.real.yml` to `.env` (this also adds the ClamAV virus scanner, which the real mode needs for every upload; without it uploads are refused after the switch), so every later command keeps it, with the file at `config/local/payment-instructions.json`. That folder is left out of Git and of image builds, so the details stay on your machine.
