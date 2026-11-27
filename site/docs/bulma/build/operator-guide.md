# Operator guide

> Bulma v0.2.0. Source: https://github.com/vegeta-labs/bulma/blob/0eac4d1c8e969aa7bf876540873df26b7b6c5379/docs/en/operator-guide.md

The operator runs a Bulma instance: it deploys it, configures it and reviews what leads and investors do in it. This page lists the guides and the review work in the app. Leads and investors have their own guides: see [Use Bulma](https://vegeta-ops.vercel.app/docs/bulma.md).

Read [who does what](https://vegeta-ops.vercel.app/docs/bulma/build/responsibilities.md) and the [due-diligence note](https://vegeta-ops.vercel.app/docs/bulma/build/due-diligence.md) first. Compliance is yours: the software records what people state and decide, and that page lists the gaps no control covers.

## Deploy and run

| Guide | What it covers |
|---|---|
| [Run locally and deploy your own copy](https://vegeta-ops.vercel.app/docs/bulma/build/run-and-deploy.md) | Build and start an instance, the first admin, HTTPS and `TRUST_PROXY`. |
| [What the real mode asks for](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md) | The switch from sandbox to real, two-admin approvals, sending mail, the KYC provider and the payment instructions file. |
| [Upgrades and backups](https://vegeta-ops.vercel.app/docs/bulma/build/upgrade-and-backup.md) | Backing up the database, files and secrets; upgrading, rolling back and restoring. |
| [Who does what](https://vegeta-ops.vercel.app/docs/bulma/build/responsibilities.md) | Which controls the software has, and which are yours. |
| [Due-diligence note](https://vegeta-ops.vercel.app/docs/bulma/build/due-diligence.md) | For anyone deciding whether to rely on this software. |
| [Release notes](https://vegeta-ops.vercel.app/docs/bulma/release-notes.md) | What changed in each version, including gates, warnings and calculations. |

A real instance sends mail through your own SMTP server. Until one is set up, registration, password resets and other steps that send a link are refused: see [sending mail](https://vegeta-ops.vercel.app/docs/bulma/build/real-mode.md#sending-mail).

## Roles

There are three staff roles: **admin**, **reviewer** and **approver**. Admins give them under **People and roles** on **Home**. A role works only once its holder has turned on two-step sign-in. In the real mode, a second admin approves each role change. A reviewer cannot review a deal they lead, work on or receive carry from.

## Review work in the app

Your work appears as sections on **Home**, plus **Deal review**, **Content approval** and **Operations** in the menu. An approver's queues are on **Content approval**, except the deal sheet wording, which is on **Home**.

- **Deal review** (reviewer): read the deal and decide **Approve**, **Ask for changes** or **Refuse**. Refusing is final. Also pass or send back the **Company check**.
- **Content approval** (approver): **Record the approval** of the reviewed version. It is needed before a deal on a real instance goes live, and in the sandbox if an admin turned that on in **Deal settings**. It is your internal record, not the statutory approval of a financial promotion.
- **Identity checks waiting** (reviewer): **Pass the documents**, **Send back** or **Refuse for good**. A provider result is a suggestion: the decision is yours. Sanctions and PEP screening are outside this software.
- **Bank accounts waiting** and **Statements that did not qualify** (reviewer).
- **Link terms waiting for you** (reviewer): approve link terms that differ from the default, where your pack asks for it.
- **Money received** (reviewer or admin, from **Live deals**): record each payment that reached your account, as the bank shows it. A reversal keeps the record. Leads cannot record money.
- **Deal sheet wording, version** N (approver, on **Home**): approve the admin's new deal sheet text with **Approve this wording**.
- **Pause** (reviewer): stop one deal, one lead's deals, or everything, at once. Someone else must end it.
- **Changes to live deals waiting for approval** (approver, on **Content approval**): **Approve the change** after a reviewer has passed it.
- **Messages waiting for approval** (approver, on **Content approval**): a lead's message to investors; **Approve this message** with your name as you state it.
- **Mail wording waiting for approval** (approver, on **Content approval**): an admin's new wording for mail to investors.

Admin sections: **Instance mode**, **Changes waiting for an admin**, **Regime packs**, **Platform fee**, **Deal settings**, **Switches**, **Deal sheet**, **Mail to investors**, **Receiving accounts**, **Audit log**, **How long things are kept** and, in the sandbox, **Sandbox outbox**.

**Switches** also holds the number of reminders, **Days between payment reminders (0 for none)**, the **Address for complaints**, the working days to answer a proposed new amount and to reconfirm changed terms, and the note on fees shown when a deal is cancelled. Urgent mails, such as those telling an investor not to pay, have fixed words that nobody can edit.

**How long things are kept** also covers payments: **Years payment details are kept, counted from each payment (at most 10)**. When that time passes, the payer's details are taken out and the amounts stay. A deal's own records go a set time after the deal ended, unless a hold stops it.

## Operations

**Operations** (staff) has three parts.

- **To do**: one list across every deal, with filters by kind, deal and who is on it. Each item shows the person, amount, days waiting and what it is about; assign it to a colleague. Items on deals where you have a stake are left out and someone else handles them.
- **Deals**: every deal with its stage, target date, money and flags. Open a deal to see its **Decisions**, **Changes to review**, the **Investor list** read only, and **Goten roster and ledger**.
- **Complaints**: complaints made in the app and ones you enter from email (**Enter a complaint that came by email**). **Acknowledge and email them**, or record that you acknowledged by email.

On a deal:

- **Decisions** (reviewer): a request to cancel (**Confirm the cancellation** or **Decline** with a note; whoever asked cannot decide), withdrawals the lead recorded (**Accept the withdrawal** or **Decline**), and people who did not reconfirm in time (**Exclude them and refund**, with how they were told). **Take back the request to close** and **Archive the deal** (once a cancelled deal has no refund left and no money held) are here too, and **Ask to cancel this deal**, which another reviewer confirms.
- **Changes to review** (reviewer): a lead's change to a live deal. Changes to what investors get, such as a higher price, the carry or the fees, are always reconfirmed; for other changes, decide whether investors are only told or must reconfirm. Or **Return it to the lead**. Where content approval is asked for (always on a real instance, in the sandbox if an admin turned it on), an approver then approves it. A change to one person's terms takes effect on your decision.
- **Evidence pack** (reviewer or admin): for each investor, a PDF to read and a JSON list to check, with everything the site recorded for that person and deal, and their statements, warnings, assessment and identity checks. Each export is in the audit log. Someone with a stake in the deal cannot export it.
- **Goten roster and ledger**: **Make the roster for Goten** gives a CSV to copy into Goten. **Read back a Goten ledger** checks Goten's ledger against what is recorded; you decide each row.

## Money

**Money: bank statements, unassigned money, refunds and held money**, from **Operations**. Bulma never moves money: you record what you do at the bank.

- **Bank statement**: choose the **Receiving account** and paste or choose the CSV, then **Check the statement**. One statement covers every deal paid into the account; lines are matched by reference, and a line already taken in is not counted again. Nothing is recorded until you decide each row: **Record it for this person**, **Same transfer as a receipt already recorded**, **List it as unallocated money** or **Skip it**.
- **Money not yet assigned**: money nobody could be matched to, oldest first, with who it may be for. **Take it over**, then assign it or split it between people. **Ask to return it** to the payer; someone else approves the return. Money recorded for the wrong person can be moved, with the reason.
- **Refunds and held money**: everyone with money due back, held, to check, or a refund under way. **Prepare the refund** (to another account only with evidence), someone else clicks **Approve the refund**, then **Mark as sent** and **Record the refund**. Only one refund per person is under way at a time.
- **Held after a refused identity check**: the money stays held until you record the steps (**Record the disclosure and consent step**, **Record that release is allowed**), each with its basis, and then **Release** it.
- **Payments to check**: money from someone other than the investor, to accept or decline, and reports of a wrong reference.

Money that arrives after someone's part ended is recorded and listed for refund.

### Bulma and Goten count some things differently

Bulma's matching is its own code, not Goten's. Only the roster and the reconciliation ledger pass between them; closing does not. Where the two differ:

- **Refunds.** Bulma counts money received net of refunds made or under way. Goten counts it gross: a refund is a line of money out, which it skips. When anyone in the roster has a refund, Bulma warns you to check their rows in Goten.
- **`refund_only`.** The roster marks everyone in a final state, not only those who withdrew, so their money is matched and not chased. Goten does not read this column; check those rows yourself.
- **The same statement twice.** Bulma recognises lines it already has, even without a transaction ID. Goten lists such lines as possible duplicates.
- **Nothing is recorded by itself.** Bulma records a statement line only after you decide it.
- **References only.** Bulma matches by exact reference and does not suggest near matches; anything else goes to **Money not yet assigned**.
- **Amounts.** The amount does not take part in the match: a line for a different amount is still matched to that person.
- **Currency.** It comes from the receiving account you choose. A line in another currency goes to **Money not yet assigned**.
- **One statement for every deal.** References are unique across the instance.
- **Lines after the cut-off date.** Goten leaves lines dated after its cut-off out of that reconciliation. Bulma has no cut-off and still matches them, so the money received for a person can differ.
- **Dates before 2000.** Bulma refuses the whole statement. Goten accepts such lines.
- **Late money.** Money that arrives after a deal is settled is marked as late and listed for refund. No deal reaches settled in this version: the steps after **Ask to close** are not built yet. Goten has nothing like this.
- **Money already recorded.** When a statement line has the same person and amount as money you already recorded, Bulma asks whether it is the same transfer, so it is counted once. Goten has nothing like this.

## Not built yet

Closing a deal: a reviewer can see a request to close but cannot take the deal on to completion.
