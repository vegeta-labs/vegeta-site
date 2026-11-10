# Reconciliation: match receipts and chase the rest

> Goten v1.3.1. Source: https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/use/reconciliation.md

Reconciliation compares your bank statement with your investor list, so you know who has paid, who is short and which receipts are not part of the deal.

## What you need

- The deal set up in **Deal settings**, especially **Currency** and **As-of date**.
- An investor list and a bank statement. See [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md).

## How receipts get booked

Goten books a receipt on its own in one case only: the bank reference contains exactly one investor's payment reference, once ordinary keyboard spaces, punctuation and letter case are ignored, and the line is not a possible duplicate. Special characters such as a long dash (–) are not ignored, so a line using one may need matching by hand.

- NW002 NORTHWIND matches NW-002.
- NW-0019 does not match NW-001. It is a different reference, so it is never booked to that investor.

Everything else stays unbooked until you decide. Suggestions are scored from 0 to 1 and show their reasons. A score is a prompt to look, not a reason to accept: see [How the numbers work](https://vegeta-ops.vercel.app/docs/goten/use/how-the-numbers-work.md#how-receipts-are-matched).

## Steps

1. Open **1. Reconciliation** and read the **Summary**.
2. Work through **Needs your review**. For each receipt, either:
   - click **Confirm** and the investor's name to accept a suggestion,
   - choose someone from **Assign to…** if the suggestion is wrong, or
   - click **Not part of this deal**.
3. Check **Bank lines** for anything marked **Not matched**, and assign it or mark it the same way.
4. Read the **Investors** table and chase anyone short or unpaid.
5. Click **Hand off to allocation** when you are ready.

To change your mind, click **Undo** next to the line under **Bank lines**. A line booked automatically has no **Undo**: to change it, edit or delete the bank line.

## Asking who sent a payment

Under a suggestion, **Copy query** copies a question for that investor. It contains only the date, the amount and the currency, never the payer's name, the bank reference or the transaction ID, because the payment may not be theirs. Send it from your own email.

## Chasing investors

Each investor who is short or has not paid has **Copy message** in the **Chase** column. It copies a chase email with what is outstanding and their payment reference, and asks anyone who has already paid to send the bank's MT103 and its UETR: an MT103 is the bank's record of an international transfer, and the UETR is the number that tracks it between banks.

- You should see **Copied. Send it yourself from your usual email.**
- If your browser blocks the clipboard, you see **Could not copy. Select the text and copy it yourself.** and the text is shown selected.

**Export chase list CSV** gives everyone on the chase list in one file, with the same text in a message column. Goten sends nothing itself.

## What you should see

Bank line statuses:

| Status                                | Meaning                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Matched automatically**             | Booked by the reference rule.                                                                       |
| **Confirmed by you**                  | Booked by a person.                                                                                 |
| **Needs review**                      | There is at least one candidate, or an earlier decision was set aside, and it waits for a decision. |
| **Not matched**                       | No candidate. Does not block the hand-off, but the money is counted for nobody.                     |
| **Not part of this deal**             | You decided it does not belong.                                                                     |
| **Skipped: not a receipt**            | A payment out or a zero amount.                                                                     |
| **After the as-of date: not counted** | Dated after the as-of date. Change the as-of date when you want it counted.                         |

Investor statuses: **Paid in full**, **Underpaid**, **Overpaid**, **Not paid** and **Withdrawn**.

Summary figures:

- **Receipts in scope** counts money in up to the as-of date.
- **Booked to investors** plus **Not booked** always equals **Receipts in scope**.
- **To refund** lists over-payments and everything paid by withdrawn investors.

## The hand-off

**Hand off to allocation** copies each investor's received amount, up to their cash due, into **2. Allocation**. Anything above the cash due is listed as a refund. Bank lines marked **Not matched** do not stop it, but their money is not carried for anyone.

The hand-off is a snapshot. If you change reconciliation afterwards, **2. Allocation** says **out of date** instead of changing by itself. Open it and click **Hand off again (replaces the investor list)**. Any change to reconciliation does this, even one that ends up putting things back as they were.

## When it goes wrong

| What you see                                                               | What it means and what to do                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Your earlier decision no longer matches the data, so it was set aside.** | You edited the bank line or the investor after deciding. Decide again, or click **Clear old decision**. Changing the value back does not restore the decision.                                               |
| **Possible duplicate import** on a line                                    | Two lines with no transaction ID have the same date, amount, payer and reference. Neither is booked automatically. If only one is real, delete the other or mark it **Not part of this deal**.               |
| **Needs review: unmatched for N days**                                     | A reminder that the receipt has been unmatched longer than your setting. It is not a regulatory deadline and not an instruction to move money. A line you have marked **Not part of this deal** does not get it. |
| **Input errors — no results until these are fixed**                        | A value in a table cannot be read. The message names the row and field. No figures appear and the exports wait until it is fixed.                                                                            |
| **Hand-off disabled: Review the 3 suggested matches first.**               | Decide everything under **Needs your review** first.                                                                                                                                                         |
| **Updating after your edit — the figures below are from before it.**       | Goten waits until you stop typing. Press Enter or leave the field to update now.                                                                                                                             |

Where a withdrawn investor or a fee payer change is involved, see [Withdrawing an investor and changing who pays a fee](https://vegeta-ops.vercel.app/docs/goten/use/withdrawal-and-fee-payer.md).
