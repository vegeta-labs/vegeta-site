# Closing allocation

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/use/closing-allocation.md

The allocation works out what each investor invests, pays in fees and gets back, what is wired to the company, and whether the deal can close.

## What you need

- Investors with the cash received from each. Hand them off from [Reconciliation](https://vegeta-ops.vercel.app/docs/goten/use/reconciliation.md), or import them in the section **Investors** (see [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md)).
- The **Share price (£ per share)** for the round.
- Your fees, and who pays each one.
- **Minimum commitment** and **Investor percentage fees** set in **Deal settings**.

## Steps

1. Open **2. Allocation**.
2. Under **Round**, enter the share price. Enter the round cap if there is one; blank means no cap.
3. Under **Fees**, click **Add fee** for each fee and fill in its row: name, **Paid by**, **Type**, and the rate or amount.
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

The **Refunds** figure covers refunds within the allocation. Over-payments and withdrawn investors' money are listed separately under **Refunds outside the allocation (not carried into it)**, and appear at the end of the closing confirmation.

## The cap and scale-back

If the amounts investors can invest add up to more than the round cap, everyone is cut back in proportion and you see **Demand was over the round cap, so every investor was scaled back pro rata.** Scaling back can take someone below the minimum: then the deal cannot close, and they are named.

In the sample, a cap of £80,000 scales everyone back and stops the close, because Isla Campbell falls below the £1,000 minimum.

## SEIS and EIS

For investors with a scheme, **S/EIS claimable (est.)** shows the whole shares and their value. Part of an investment can fall outside whole shares, shown as **not claimable**: tax relief is per whole share, while the nominee holds fractions. These are estimates and do not decide eligibility, so check the final allocated share count.

**By tax scheme** totals investors, amounts and shares for each scheme. SEIS shares must be issued on an earlier day than EIS shares; the same day is not enough.

## When it goes wrong

| What you see                                                                  | What it means and what to do                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Can't close yet**                                                           | A blocker: no investor can be allocated, company-paid fees exceed the amount raised, or scale-back left someone below the minimum. The reasons are listed. Copy and export wait.              |
| **Copy and export are disabled until the blockers above are resolved.**       | Fix the blocker, for example by raising the cap or lowering the minimum.                                                                                                                      |
| **Copy and export are disabled until you keep or remove the flagged refund.** | You edited an investor after the hand-off, so Goten asks whether their refund still applies. Click **Keep refund** or **Remove refund**.                                                      |
| **Out of date: reconciliation has changed since this hand-off.**              | Click **Hand off again (replaces the investor list)**. Your own edits to the investor list here are replaced. Until you do, copy, export and hand-off to exit are disabled, so old figures are not sent on. |
| **No figures until you hand off again**                                       | A fee payer change moved the fee at once, but the investors' amounts here only update at hand-off. The refund list, results and confirmation come back after you hand off again. |
| **Input errors — no results until these are fixed**                           | Fix the named field. For example **Allocation, share price: required** until you enter a share price.                                                                                         |
