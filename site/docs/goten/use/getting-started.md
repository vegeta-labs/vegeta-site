# Walk the sample deal

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/use/getting-started.md

Go through all three steps with the built-in Northwind Robotics seed round. It has 12 investors and 16 bank lines, in pounds.

## What you need

- A modern browser. The hosted copy is at https://vegeta-goten.vercel.app.
- Nothing else. The sample needs no files.

Loading the sample replaces whatever is on the page and clears the activity log. If there is anything to lose, Goten asks first: click **Replace with sample** to go ahead or **Cancel** to stop. This cannot be undone, so [export what you need](https://vegeta-ops.vercel.app/docs/goten/use/exports-and-records.md) first.

## Steps

### 1. Open Goten and load the sample

1. Open the page. A card headed **Before you start** appears.
2. Click **I understand**. (**I understand — take the 3-minute tour** starts a guided version of this page instead; see [The guided tour](#the-guided-tour).)
3. Click **Load sample deal** at the top of the page.

You land on **1. Reconciliation**. The **Summary** shows:

| Label               | Value       |
| ------------------- | ----------- |
| Receipts in scope   | £114,840.00 |
| Booked to investors | £66,000.00  |
| Not booked          | £48,840.00  |
| Waiting for review  | 3           |
| Cash due            | £124,000.00 |

Nine receipts were booked automatically, because their bank reference contains exactly one investor's payment reference. Everything else waits for you.

### 2. Review the three suggestions

Under **Needs your review · 3**, each receipt lists its suggested investor with a score and the reasons for it. Click:

- **Confirm Chloe Martin** for £20,000.00 with no reference (score 0.55).
- **Confirm Elena Rossi** for £15,000.00 from a family office (score 0.35).
- **Confirm Kavya Iyer** for £7,500.00 with the reference NW 11 (score 0.80).

**Booked to investors** rises to £108,500.00 and **Waiting for review** falls to 0.

### 3. Mark the two payments that are not part of the deal

Under **Bank lines**, find WESTBRIDGE SUPPLIES (£2,340.00) and SAM PATEL (£4,000.00, reference NW-0019). Click **Not part of this deal** on each.

**Not booked** is now £6,340.00. Those two lines count for nobody.

### 4. Read the investor status and hand off

The **Investors** table shows who has paid:

- David Kim is **Underpaid** by £500.00.
- Hugo Bernard is **Overpaid** by £5,000.00, listed under **To refund · 1**.
- James Whitfield is **Not paid**: his £3,000.00 is dated 18 October, after the deal's as-of date of 16 October, so it is shown as **After the as-of date: not counted**.

Click **Hand off to allocation**. Goten opens **2. Allocation**.

### 5. Check the allocation

The share price (£2.4137), round cap (£150,000), platform fee (3%, paid by investors) and legal fee (£1,500, paid by the company) are already filled in. The **Result** shows:

| Label             | Value       |
| ----------------- | ----------- |
| Cash received     | £103,500.00 |
| Total invested    | £100,395.00 |
| Investor fees     | £3,105.00   |
| Refunds           | £0.00       |
| Company-paid fees | £1,500.00   |
| Wire to company   | £98,895.00  |

The £5,000.00 Hugo overpaid is not in these figures: it is listed under **Refunds outside the allocation**. James is shown as **Out: No money received**.

Click **Hand off to exit distribution**. Goten opens **3. Exit distribution**.

### 6. Read the exit

The sample exit is already filled in: £390,000 of proceeds, £4,500 of costs, 6 years held, 20% carry, an 8% hurdle and 100% catch-up. The **Result** shows:

| Label             | Value       |
| ----------------- | ----------- |
| Exit costs paid   | £4,500.00   |
| Amount invested   | £100,395.00 |
| Carry to the lead | £57,021.00  |
| To investors      | £328,479.00 |

**Step by step** shows each layer of the split and why. Every result page ends with **Checks**; all of them should show a tick, apart from reminders.

### 7. See the record

Open **Activity log** to see every decision you just made, newest first.

## The guided tour

**Take the tour** in the sidebar walks the same deal in 12 steps. Follow the card in the corner: press **Next** or Enter, click **Do this for me** when a step asks you to act, or leave at any time with **Exit tour** or Esc. **Resume tour** picks up where you left it.

## When you are finished

- To try your own deal, click **Clear all data** and then **Clear everything**, and go to [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md). Clearing cannot be undone.
- **Load sample deal** brings the sample back at any time.

## When it goes wrong

| What you see                                                          | What to do                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Hand-off disabled: Review the 3 suggested matches first.**          | A suggestion is still waiting. Decide it under **Needs your review**.                                                            |
| **Hand off to allocation** stays greyed out                           | Read the line under the buttons. If it says **Finish your edit first.**, press Enter or click out of the field you were editing. |
| Different figures from this page                                      | You changed something, or some suggestions were decided differently. **Load sample deal** starts again.                          |
| **out of date** next to **2. Allocation** or **3. Exit distribution** | Something upstream changed after the hand-off. Open the page and click **Hand off again**. If **3. Exit distribution** has no such button, hand off again on **2. Allocation** first. |
