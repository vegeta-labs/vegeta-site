# Withdrawing an investor and changing who pays a fee

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/use/withdrawal-and-fee-payer.md

Both of these are for before closing. Goten records each one beside your investor list, so your list is never rewritten and each can be undone.

## Withdrawing an investor

Use this when an investor pulls out of the deal before closing, with their written consent. Everything they paid moves to refunds.

### What you need

- The investor's written consent.
- The withdrawal date. Goten suggests the as-of date.

### Steps

1. Open **1. Reconciliation** and find the investor in the **Investors** table.
2. Click **Mark withdrawn**.
3. Tick **Written consent from the investor received**.
4. Check **Withdrawal date**, then click **Confirm withdrawal**.

### What you should see

With Lucas Meyer in the sample, who paid £3,000.00:

- His status is **Withdrawn** with the date, and the summary says **Withdrawn: 1 investor, £3,000.00 to refund**.
- **Cash due** becomes **Cash due (excluding withdrawn)** and drops by what he owed, to £121,000.00.
- He is listed under **To refund** as **(Withdrawn)**, and is no longer on the chase list.
- His receipts stay under his name in the ledger, and the ledger export shows the date in its withdrawn_on column.
- If you have already handed off, **2. Allocation** shows **out of date**. Click **Hand off again (replaces the investor list)**.

After handing off again he is not in the allocation, and the closing confirmation lists him under **Withdrawn before closing (refund in full)**.

To reverse it, click **Undo withdrawal**.

### When it goes wrong

| What you see                                                 | What it means and what to do                                                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tick “Written consent from the investor received” first.** | Tick the box once you hold the consent.                                                                                                                                         |
| **Withdrawal date: … is not a real date**                    | Use YYYY-MM-DD or DD/MM/YYYY.                                                                                                                                                   |
| The investor is no longer marked withdrawn                   | The mark is voided if the investor is deleted, or their investor ID or payment reference is changed. Check it in the **Activity log**, and mark them again if it still applies. |

## Changing who pays a fee

Use this when a percentage fee moves between investors, the company and the lead before closing. Each investor keeps the same investment; their amount due changes instead.

Only percentage fees can move. Change fixed fees by hand in the **Fees** table.

### What you need

- A hand-off from reconciliation that is up to date, with no edits to the investor list since. Otherwise the panel says **Not available** and why.
- Consent from the new payer, if it is investors or the company. Moving a fee to the lead needs no consent.

### Steps

1. Open **2. Allocation** and go to **Change who pays a fee**.
2. Choose the **Fee** and the **New payer**.
3. Read the preview: **Cash due now**, **Investment kept**, **New cash due** and **Difference** for each investor, and the fee's total before and after.
4. Read what the new payer needs. If it needs consent, and you hold the evidence, tick **Consent evidence received**.
5. Click the button that starts with **Apply:**. It states the top-ups and refunds, for example **Apply: 0 top-ups totalling £0.00 · 12 refunds totalling £3,720.00**.

| New payer     | What Goten shows                                                       |
| ------------- | ---------------------------------------------------------------------- |
| **Investors** | **Investors’ consent needed — keep the evidence**                      |
| **Company**   | **The company’s consent needed — it pays by invoice or from the wire** |
| **Lead**      | **Inform only — no consent needed**                                    |

### What you should see

The fee in the **Fees** table changes payer, and a banner appears: **Fee payer change active: Platform fee → company · consent recorded · Reverse**. Only one change can be active at a time.

**2. Allocation** shows **out of date** until you hand off again, and shows no results until you do: the fee has already moved, but the investors' amounts there have not, so any results would be wrong. Go to **1. Reconciliation**, check it, and click **Hand off to allocation**.

In **1. Reconciliation** each investor's cash due shows where the amount came from, such as **was £10,000.00 · −£300.00 fee payer change (Platform fee: investors → company)**. An investor who has already paid the old amount shows as **Overpaid** and is listed for a refund of the difference; someone who now owes more shows as **Underpaid** and goes on the chase list.

With the sample, moving the platform fee to the company, and handing off again, gives **Total invested** £100,455.00, **Company-paid fees** £4,513.65 and **Wire to company** £95,941.35.

To undo it, click **Reverse**. No consent is needed to reverse. The fee goes back to its original payer and every amount goes back. The allocation is then out of date and shows no results, so hand off again.

While a change is active, **Currency** in **Deal settings** cannot be changed.

### When it goes wrong

| What you see                                                                                | What it means and what to do                                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Isla Campbell would fall below the minimum commitment**                                   | In the sample, moving the fee away from investors takes her cash due to £970.00, under the £1,000 minimum, so the change is blocked. Lower the **Minimum commitment** in **Deal settings**. |
| **The round is over the cap — resolve the scale-back first**                                | The change is worked out on what investors are due, and scale-back would mix into it. Raise the cap first.                                                                                  |
| **Not available: The allocation is out of date. Hand off from reconciliation again first.** | Hand off again, then come back.                                                                                                                                                             |
| **Not available: The investor table was edited after the hand-off.**                        | Hand off again, which replaces your edits.                                                                                                                                                  |
| **The fee payer change (…) no longer applies — redo it.**                                   | The fee's rate, payer or type was edited, the fee was deleted, or the fee basis changed. The whole change is void for good; changing the value back does not restore it.                    |
| **This fee payer change no longer applies — redo it** on one investor                       | Their ID or reference changed, or their cash due was edited by hand. **Reverse** the change and redo it.                                                                                    |
| **Not covered by the active fee payer change — reverse and redo**                           | An investor was added or restored after the change was applied. Hand-off stays disabled until you **Reverse** it and redo it.                                                               |
| **Allocation settings changed since this fee payer change — any problems are listed here**             | You changed the minimum, cap, share price or another fee. The change still stands. Any problems are listed under the banner.                                                                |

If you need to change how much someone owes for any other reason, edit **Cash due** in the investor list before you apply a change. See [How the numbers work](https://vegeta-ops.vercel.app/docs/goten/use/how-the-numbers-work.md#changing-who-pays-a-fee) for the calculation.
