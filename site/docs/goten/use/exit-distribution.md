# Exit distribution

> Goten v1.5.1. Source: https://github.com/vegeta-labs/goten/blob/ad7873e61594d4b77b9974d3076a0f2cc9b7057d/docs/en/use/exit-distribution.md

The exit page splits sale proceeds between investors and the lead, and shows each step of the split. It handles one investment and one exit. Each investor can have their own carry rate (see [Personal carry](#personal-carry)); the hurdle, catch-up and years held are the same for the whole deal.

## The terms, in plain words

- **Exit proceeds** are the money received for the sale.
- **Exit costs** are paid first, before anyone else.
- **Carry** is the lead's share of the profit, after investors have their money back.
- A **hurdle** is a minimum yearly return investors must receive, compounding, before the lead earns any carry.
- **Catch-up** is a band of profit after the hurdle of which the lead receives the catch-up percentage you set, until the lead has its full carry share.
- **Tiered carry** rises in steps with the return multiple. Each rate applies only to the profit inside its band.

There is a **?** next to these terms on the page, and a **Glossary** in the footer.

## What you need

- Holdings: hand them off from [Closing allocation](https://vegeta-ops.vercel.app/docs/goten/use/closing-allocation.md), or import them (see [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md)). Each holding is the amount invested, excluding fees.
- The proceeds, costs and years held.
- Your carry terms.

## Steps

1. Open **3. Exit distribution**.
2. Check **Holdings**. It folds once it has a list; click the heading to open it.
3. Under **Exit**, enter **Exit proceeds**, **Exit costs** (blank means none) and **Years held** (0 to 50, up to two decimals).
4. Under **Carry**, choose one of:
   - **Fixed rate, with an optional hurdle and catch-up**: enter **Carry %** (required), **Hurdle % a year, compounding** and **Catch-up %**. A blank hurdle or catch-up means none. Catch-up needs a hurdle and must be above the carry rate.
   - **Tiered by return multiple (no hurdle or catch-up)**: enter a rate for the last tier, then click **Add tier** for each extra band. A new band is added above the last one, so the last tier always has no ceiling. **Up to multiple** is measured before carry and after exit costs.
5. Read **Result** and **Checks**, then click **Export distribution CSV**.

Switching between the two carry types clears the carry fields, so enter them again.

## What you should see

For the sample deal, with £390,000 proceeds, £4,500 costs, 6 years, 20% carry, an 8% hurdle and 100% catch-up, **Step by step** shows:

| Step                      | To investors | To the lead |
| ------------------------- | ------------ | ----------- |
| Exit costs                | —            | —           |
| Return of capital         | £100,395.00  | £0.00       |
| Preferred return (hurdle) | £58,919.25   | £0.00       |
| Lead catch-up             | £0.00        | £14,729.81  |
| Carried interest split    | £169,164.75  | £42,291.19  |
| Total                     | £328,479.00  | £57,021.00  |

Carry comes to exactly 20% of the £285,105.00 profit. Each step shows why under **Why**.

When everyone has the same carry, investors share their total in proportion to the amount each invested. **Per investor** shows the amount invested, shares, **Distribution**, **Profit or loss** and **Multiple**. The multiple is distribution divided by amount invested and does not count entry fees.

## Personal carry

Each holding can have its own carry rate, in the holding's **carry** cell or the `carry` column of an investor list or holdings file. With a fixed rate, a blank cell means the deal's **Carry %**, and 0 means no carry for that investor. Carry rates come with each investor from reconciliation through the allocation to the exit.

If every holding ends up with the same rate, the split is worked out exactly as before, with that rate. If the rates differ:

- The proceeds after exit costs are first split by amount invested.
- Each investor's carry is then worked out on their own share, with the deal's hurdle, catch-up and years held. **Each investor's own waterfall** shows each one's **Carry rate**, **Share of proceeds**, **Capital back**, **Hurdle**, **Catch-up to lead**, **Carry** and **To investor**.
- Multiples can then differ between investors, because each pays carry at their own rate.
- Tiered carry uses the tier table for everyone. Either leave every holding's carry blank, or fill in the same rate for all; then the page notes that the tier table is used instead. If some are blank and some filled you see **Fill in every investor's carry, or none, for tiered carry**, and if the filled rates differ, **Tiered carry needs the same carry for every investor**. Use a fixed rate, or make the rates the same.

## Carry payees

Under **Carry payees**, click **Add payee** to split the carry between named people, each with a **Share (%)**. The shares must add up to 100%. Each payee's amount is rounded to the penny; any pennies left over go to the largest remainders, and an equal remainder goes to the payee higher in the list. With no list, the lead receives all the carry. When there is carry, each payee's amount is listed under the waterfall, and **Export carry payees CSV** saves them.

## Losses

If proceeds after costs are less than the amount invested, investors take a loss and there is no carry. A loss is not an error. With £80,000 of proceeds in the sample, investors get £75,500.00 between them, 0.75x.

## When it goes wrong

| What you see                                                                      | What it means and what to do                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cannot distribute. Exit costs are more than the proceeds by …**                 | Nothing goes to anyone, and **Export distribution CSV** is disabled until you resolve it. Check the two amounts.                                                                                                                                                                    |
| **Exit, catch-up: catch-up must be higher than the carry rate**                   | Raise the catch-up, or leave it blank.                                                                                                                                                                                                                                              |
| **Exit, proceeds: required** and similar                                          | Fill in the named fields. No result appears until they are valid.                                                                                                                                                                                                                   |
| **Tier 1, up to multiple: must be greater than 1**                                | Multiples are written like 3 or 3.00x and each must be above the one before.                                                                                                                                                                                                        |
| **Out of date: the allocation has changed since these holdings were handed off.** | Click **Hand off again (replaces the holdings)**. If the allocation has a blocker or is out of date, resolve that first; the holdings count as out of date while the allocation is. Until you hand off again, **Export holdings CSV** and **Export distribution CSV** are disabled. |
