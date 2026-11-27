# Bulma — SPV Workspace — release notes

> Bulma v0.2.0. Source: https://github.com/vegeta-labs/bulma/blob/0eac4d1c8e969aa7bf876540873df26b7b6c5379/docs/en/RELEASE_NOTES.md

Only what is built, tested and in the tagged version is listed. Format: [release notes template](https://github.com/vegeta-labs/bulma/blob/0eac4d1c8e969aa7bf876540873df26b7b6c5379/docs/en/release-notes-template.md).

## v0.2.0 (2026-11-27): A ready-made demo deal for the sandbox, and a static demo of it to look at without installing anything

In the sandbox, an admin can add a demo deal with one click: a fictional lead with three deals and four investors at different steps, so there is something to look at straight away. The same scenario, recorded on a fixed date, is also published as a static demo pack that opens in a browser with no server.

Also in this version:
- The demo deal: **Add demo deal** on the admin's **Home**, or `BULMA_DEMO_DEAL=1` when the app starts. The sign-ins are shown once, or written to a file only the app's user can read. The demo accounts are never admins or approvers; the demo reviewer that approves the demo deal is retired as soon as it is added. Demo and ordinary people, deals, syndicates, companies and money never mix. When the instance switches to the real mode, the demo accounts stop working and the demo records are hidden. See [Walk the sandbox](https://vegeta-ops.vercel.app/docs/bulma/use/getting-started.md#a-ready-made-demo-deal).
- The static demo pack `bulma-demo-v0.2.0.tar.gz`: the investor's, the lead's and the reviewer's view of the demo deal, with its PDFs and CSV files, as recorded on 2 November 2026. It sends nothing anywhere and stores nothing; buttons that would change something say that this is a demo.

### Gates
- The reminder about how many people a deal has reached now also counts people who have passed it or whose invitation was withdrawn: they have received the promotion. It is still only a reminder.
- An eligibility retake recognises a question by its wording, not by its number, so the same question under a new number is not asked again. If the question bank has too few questions left that the person has not seen, the retake does not start and says why. A test already given and not finished is shown as it was given.
- Only an admin can add the demo deal, only in the sandbox and only once. Who can see or do what on ordinary deals is unchanged.

### Warnings
No change for ordinary deals. The demo deal uses its own demo regime pack, whose warnings are sample text that says it is not legal text.

### Calculations
No change. If no platform fee has been set when the demo deal is added, it sets a sample one so the demo can run.

### Other changes
Checked on the release branch on 2026-11-27, run locally:
- Unit and real-database tests: 1,246 of 1,246 pass.
- Browser tests: 41 of 41 pass, and 6 of 6 on the static demo pack.
- Test-plan cases due by this version: 201 of 201 have a passing test.
- Deliberate code breakages (full mutation run): 1,878 of 1,878 caught.
- Python oracle, written separately from the code: 35,084 of 35,084 random and boundary cases match.

## v0.1.0 (2026-11-21): Run an SPV deal from set-up to money received, refunds and a request to close, in a sandbox by default

The first version. A new instance starts as a sandbox with fictional data, and no email leaves it. A lead sets up a deal and a syndicate; the company sends its documents through a link without an account; a reviewer approves the deal and the lead takes it live. Investors are invited by link or email, confirm eligibility, commit, pass an identity check decided by a person at the operator, sign the deal sheet and get payment instructions. A reviewer or admin records the money that arrives, by hand or from a bank statement, and handles money nobody could be matched to, refunds and money held after a refused identity check. The software never moves money.

Also in this version:
- Email from a real instance through the operator's SMTP server, with a queue that retries; reminders to commit, to pay and to reconfirm.
- The lead's panel: who is waiting on whom, figures, filters, a CSV of the list, a preview of the deal as an investor sees it, and messages to investors that an approver passes first.
- Changes to a live deal: changes to what investors get are always reconfirmed; for other changes a reviewer decides whether investors are only told or must reconfirm. Investors reconfirm on screen.
- When a deal is full: a proposed new amount that the investor answers on one screen, or a waiting list.
- Removing an investor from whom no money has arrived; recording a withdrawal, with written consent whose evidence a reviewer accepts before the withdrawal takes effect and its refund is listed; cancelling a deal, confirmed by a second person.
- For the operator: one to-do list across deals, complaints, an evidence pack per investor (PDF and JSON), and time limits on how long records are kept.
- A roster for Goten and a read-back of Goten's reconciliation ledger, which a person confirms row by row.

Not in this version: closing. A lead can ask to close, but nothing takes the deal on to completion, and no deal's closing or allocation is handed to Goten yet. Only reconciliation is handed over: the roster goes to Goten and Goten's ledger is read back. Bulma's matching is its own code, not Goten's; the differences are listed in the [Operator guide](https://vegeta-ops.vercel.app/docs/bulma/build/operator-guide.md).

### Gates
First version: who can see or do what is described in the [Lead guide](https://vegeta-ops.vercel.app/docs/bulma/use/lead-guide.md), the [Investor guide](https://vegeta-ops.vercel.app/docs/bulma/use/investor-guide.md) and the [Operator guide](https://vegeta-ops.vercel.app/docs/bulma/build/operator-guide.md).

### Warnings
First version: warning texts come from the operator's regime pack. The packs shipped with the software hold placeholder text, and the real mode refuses placeholders.

### Calculations
First version: amounts are integer minor units and rates are basis points. Only the amount to pay is exact; investment amounts and fees are shown as estimates, because they are settled at closing, which this version does not do.

### Other changes
Checked on the release branch on 2026-11-20, run locally:
- Unit and real-database tests: 1,130 of 1,130 pass.
- Browser tests: 40 of 40 pass.
- Test-plan cases due by this version: 185 of 185 have a passing test.
- Deliberate code breakages (full mutation run): 1,477 of 1,477 caught.
- Python oracle, written separately from the code: 35,084 of 35,084 random and boundary cases match.

The published version adds two tests for the check that keeps private files out of the public repository, and gives two slow reminder tests a longer time limit. In the public repository's CI on 2026-11-20, 1,131 of its 1,132 unit and real-database tests passed and one was skipped (it needs the private list, which only the development repository has), and the 40 browser tests passed.
