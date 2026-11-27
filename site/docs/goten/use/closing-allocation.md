# Closing allocation

> Goten v1.5.1. Source: https://github.com/vegeta-labs/goten/blob/ad7873e61594d4b77b9974d3076a0f2cc9b7057d/docs/en/use/closing-allocation.md

The allocation works out what each investor invests, pays in fees and gets back, what is wired to the company, and whether the deal can close.

## What you need

- Investors with the cash received from each. Hand them off from [Reconciliation](https://vegeta-ops.vercel.app/docs/goten/use/reconciliation.md), or import them in the section **Investors** (see [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md)).
- The **Instrument**, and for equity the **Share price (£ per share)** for the round.
- Your fees, and who pays each one. Any investor's own fee terms come with them from the investor list.
- If there is one, the **Pro-rata platform fee**.
- **Minimum commitment** and **Investor percentage fees** set in **Deal settings**.

## Steps

1. Open **2. Allocation**.
2. Under **Round**, choose the **Instrument** and, for equity, enter the share price. Enter the round cap if there is one; blank means no cap.
3. Under **Fees**, click **Add fee** for each fee and fill in its row: name, **Paid by**, **Type**, and the rate or amount. For a platform fee worked out on the total raised, click **Add a pro-rata platform fee** instead (see below).
4. Read **Result** and **Checks**.
5. Under **Closing confirmation**, read the summary and click **Copy closing confirmation** to send it to the lead. Click **Export allocation CSV** for the investor-level figures.
6. Click **Hand off to exit distribution** when the deal has closed.

## Fees

Every fee has a payer, and the payer decides what types it can have:

| Paid by       | Types                                            | How it is taken                                                                                                       |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Investors** | **Percentage**, **Fixed amount per investor**    | Out of what they wired or on top of their investment, according to **Investor percentage fees** in **Deal settings**. |
| **Company**   | **Percentage of amount raised**, **Fixed total** | Out of the wire to the company.                                                                                       |
| **Lead**      | **Percentage of amount raised**, **Fixed total** | Invoiced to the lead. Shown as **Invoice to lead**; it does not reduce the wire.                                      |

A deal can have up to 20 fees. Each needs a name, and no two can share one.

To move a percentage fee to a different payer before closing, use **Change who pays a fee**: see [Withdrawing an investor and changing who pays a fee](https://vegeta-ops.vercel.app/docs/goten/use/withdrawal-and-fee-payer.md).

## An investor's own fee terms

An investor can have their own fee terms instead of the deal's: a fee mode, **On top** or **Deducted from the wire**, and at most one fee, either a rate or a fixed amount. Set them in the investor list with the `own_fee_mode`, `own_fee_rate` and `own_fee_fixed` columns (see [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md)), or in the investor tables: tick **Show own terms, refunds and refund-only flags** on the reconciliation page, or **Show own terms** on the allocation page, to see the columns. **Deal default** means the deal's terms.

For someone with their own fee terms, none of the investor-paid fees in **Fees** is charged. They pay only their own fee, shown as **own fee** in the closing confirmation and in the allocation export. A fee mode with no rate and no fixed amount means they pay no investor fee at all. Company-paid and lead-paid fees, and the pro-rata platform fee, are not affected by own terms.

A rate deducted from the wire must be less than 100%. While a fee payer change is active, the own fee terms of the people it covers cannot be changed: reverse the change first.

## The pro-rata platform fee

Click **Add a pro-rata platform fee** for a fee worked out on the total everyone invests, rather than per investor. It is separate from any fee you add under **Fees**, even one named "Platform fee".

| Field                                                      | Meaning                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Rate (%)**                                               | The rate on the total.                                                                                  |
| **Minimum (£)**                                            | The fee is at least this. Blank or 0 means no minimum.                                                  |
| **Maximum (£, blank = no cap)**                            | Caps the rate part, after the minimum. 0 caps it at nothing. The add-on comes on top and is not capped. |
| **Add-on above (£, blank = none)** and **Add-on rate (%)** | An extra rate on the part of the total above this amount.                                               |
| **Paid by**                                                | **Investors, pro rata**, **The lead (invoice)** or **The company (from the wire)**.                     |

The total it is worked out on is everyone's amount after fees, the minimum and scale-back. When investors pay, each one's share is in proportion to that amount, rounded to the penny; any pennies left over go to the largest remainders, and an equal remainder goes to the investor higher in the list. Their share comes out of what they invest; nobody's cash due changes. The page reminds you: **This changes each investor's amount invested. Get their consent as your process requires.** If the lead or the company pays, investors' amounts do not change.

To share one fixed amount between investors in proportion to what they invest, set the rate to 0 and the minimum and maximum to that amount.

With investors paying, if the fee would take all of someone's amount, the deal cannot close and they are named.

## Instruments

Choose **Equity (shares)**, **Convertible (no shares yet)** or **Fund units (no shares)**. Only equity has a share price and share counts. For the other two there is no share price field (choosing them clears it): the allocation splits amounts only, shows no share counts or S/EIS estimate, and leaves the share cells blank in exports.

## The allocation hand-off file

Another tool, such as Bulma, can send the allocation as a file. Under **Allocation hand-off (JSON)**, choose the file with **Import hand-off request**. It replaces every allocation input: investors, fees, minimum, share price, cap, instrument and platform fee. The page then lists what the request sent, including anyone **Not in this allocation**. Refunds outside the allocation, such as over-payments or money from people not in it, are not part of the request or the result: the sending tool keeps track of them.

Click **Export result** to save the result file for the same request, and give it back to the tool that sent it. **Export result** works even when the deal cannot close: the file then gives only the reasons and the investors concerned, so the sender knows what to fix. An allocation imported from a request is not tied to reconciliation: it does not go out of date when reconciliation changes, and **Change who pays a fee** is not available for it. If you change any allocation input or the currency after the import, the export is disabled, because the sender only accepts a result for the inputs it sent: import the request again. A request that cannot be read, has an unknown field, or is in a different currency from the deal is refused, with the reasons, and **Nothing was imported**. The file is read and written on your computer only; nothing is sent anywhere. The format is in [docs/formats/allocation-handoff-v1.md](https://github.com/vegeta-labs/goten/blob/ad7873e61594d4b77b9974d3076a0f2cc9b7057d/docs/formats/allocation-handoff-v1.md).

## What you should see

Using the sample deal, **Result** shows **Cash received** £103,500.00, **Total invested** £100,395.00, **Investor fees** £3,105.00, **Refunds** £0.00, **Company-paid fees** £1,500.00 and **Wire to company** £98,895.00. Amelia Hart received £10,000.00, invests £9,700.00 and pays £300.00 in fees, for 4018.726436 shares.

**Status** in the **Per investor** table is one of:

| Status                                     | Meaning                                                    |
| ------------------------------------------ | ---------------------------------------------------------- |
| **Allocated**                              | In the close, in full.                                     |
| **Scaled back**                            | In the close, cut back because the round was over the cap. |
| **Out: No money received**                 | Not in the close.                                          |
| **Out: Below the minimum commitment**      | Refunded in full, pays no fees.                            |
| **Out: Fees take everything received**     | Refunded in full, pays no fees.                            |
| **Out: Nothing left to invest after fees** | Refunded in full, pays no fees.                            |

The **Refunds** figure covers refunds within the allocation. After a hand-off from reconciliation, over-payments, withdrawn investors' money and anyone flagged refund only are listed separately under **Refunds outside the allocation (not carried into it)**, and appear at the end of the closing confirmation. After a hand-off request import there is no such list: money outside the allocation stays with the tool that sent the request.

## The cap and scale-back

If the amounts investors can invest add up to more than the round cap, everyone is cut back in proportion and you see **Demand was over the round cap, so every investor was scaled back pro rata.** Scaling back can take someone below the minimum: then the deal cannot close, and they are named.

In the sample, a cap of £80,000 scales everyone back and stops the close, because Isla Campbell falls below the £1,000 minimum.

## SEIS and EIS

For investors with a scheme, **S/EIS claimable (est.)** shows the whole shares and their value. Part of an investment can fall outside whole shares, shown as **not claimable**: tax relief is per whole share, while the nominee holds fractions. These are estimates and do not decide eligibility, so check the final allocated share count.

**By tax scheme** totals investors, amounts and shares for each scheme. SEIS shares must be issued on an earlier day than EIS shares; the same day is not enough.

## When it goes wrong

| What you see                                                                  | What it means and what to do                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Can't close yet**                                                           | A blocker: no investor can be allocated, company-paid fees exceed the amount raised, scale-back left someone below the minimum, or the pro-rata platform fee would take all of someone's amount. The reasons are listed. Copy and export wait. |
| **Copy and export are disabled until the blockers above are resolved.**       | Fix the blocker, for example by raising the cap or lowering the minimum.                                                                                                                                                                       |
| **Copy and export are disabled until you keep or remove the flagged refund.** | You edited an investor after the hand-off, so Goten asks whether their refund still applies. Click **Keep refund** or **Remove refund**.                                                                                                       |
| **Out of date: reconciliation has changed since this hand-off.**              | Click **Hand off again (replaces the investor list)**. Your own edits to the investor list here are replaced. Until you do, copy, export and hand-off to exit are disabled, so old figures are not sent on.                                    |
| **No figures until you hand off again**                                       | A fee payer change moved the fee at once, but the investors' amounts here only update at hand-off. The refund list, results and confirmation come back after you hand off again.                                                               |
| **Input errors — no results until these are fixed**                           | Fix the named field. For example **Allocation, share price: required** until you enter a share price.                                                                                                                                          |
