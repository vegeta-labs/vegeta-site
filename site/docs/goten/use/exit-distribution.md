# Exit distribution

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/use/exit-distribution.md

The exit page splits sale proceeds between investors and the lead, and shows each step of the split. It handles one investment and one exit, with the same terms for every investor.

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

Investors share their total in proportion to the amount each invested. **Per investor** shows the amount invested, shares, **Distribution**, **Profit or loss** and **Multiple**. The multiple is distribution divided by amount invested and does not count entry fees.

If proceeds after costs are less than the amount invested, investors take a loss and there is no carry. A loss is not an error. With £80,000 of proceeds in the sample, investors get £75,500.00 between them, 0.75x.

## When it goes wrong

| What you see                                                                      | What it means and what to do                                                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Cannot distribute. Exit costs are more than the proceeds by …**                 | Nothing goes to anyone, and **Export distribution CSV** is disabled until you resolve it. Check the two amounts. |
| **Exit, catch-up: catch-up must be higher than the carry rate**                   | Raise the catch-up, or leave it blank.                                                                           |
| **Exit, proceeds: required** and similar                                          | Fill in the named fields. No result appears until they are valid.                                                |
| **Tier 1, up to multiple: must be greater than 1**                                | Multiples are written like 3 or 3.00x and each must be above the one before.                                     |
| **Out of date: the allocation has changed since these holdings were handed off.** | Click **Hand off again (replaces the holdings)**. If the allocation has a blocker or is out of date, resolve that first; the holdings count as out of date while the allocation is. Until you hand off again, **Export holdings CSV** and **Export distribution CSV** are disabled. |
