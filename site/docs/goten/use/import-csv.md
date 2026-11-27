# Prepare and import your CSV files

> Goten v1.5.1. Source: https://github.com/vegeta-labs/goten/blob/ad7873e61594d4b77b9974d3076a0f2cc9b7057d/docs/en/use/import-csv.md

Goten takes four kinds of CSV file. Most deals need only the first two: the rest of the data carries over from step to step.

| File                 | Where you import it                           | Use it when                                                           |
| -------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Investor list        | **1. Reconciliation**, section Investors      | You start a deal. This is who should pay, and how much.               |
| Bank statement       | **1. Reconciliation**, section Bank statement | You have receipts to match. Import again as more arrive.              |
| Allocation investors | **2. Allocation**, section Investors          | You skip reconciliation and already know what each investor paid.     |
| Holdings             | **3. Exit distribution**, section Holdings    | You skip the allocation and already know what each investor invested. |

Column names are not case-sensitive. Each column also accepts other common names; the full list is in the [CSV reference](https://vegeta-ops.vercel.app/docs/goten/build/csv-reference.md).

## Before you import

Open **Deal settings** and fill in the deal first:

| Field                                     | What it does                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Deal name**                             | Goes into messages and the closing confirmation.                                                                                        |
| **Currency**                              | GBP, EUR or USD. Every amount in the deal is in this currency, and imports are checked against it.                                      |
| **As-of date (YYYY-MM-DD or DD/MM/YYYY)** | Bank lines dated after this are not counted. Today, unless you change it.                                                               |
| **Minimum commitment** (blank = none)     | Anyone below it is refunded in full.                                                                                                    |
| **Flag unmatched receipts after (days)**  | Receipts unmatched for longer than this get a reminder. 1 to 365; blank means 10.                                                       |
| **Your initials** (optional)              | Added to each activity log entry. Up to 10 letters, digits, spaces, dots or hyphens.                                                    |
| **Investor percentage fees**              | **Deducted from the money wired (default)** or **Added on top of the investment**. See [How the numbers work](https://vegeta-ops.vercel.app/docs/goten/use/how-the-numbers-work.md). |

If you change **Currency** when the deal already has amounts, Goten asks first. Nothing is converted: the same numbers are recorded in the new currency.

## Prepare the files

Save from your spreadsheet as CSV, UTF-8. The first line must be the column names.

**Amounts** can be 1234.56 or 1,234.56, with up to two decimals and optionally the deal's currency symbol. Commas must group in threes.

**Dates** must be YYYY-MM-DD or DD/MM/YYYY. Goten reads 06/10/2026 as 6 October. A date in month-first order that happens to be valid will be read wrongly, so check your bank's export.

**Tax scheme** is none, SEIS or EIS, in any case. Blank means none.

Blank rows are skipped. Columns Goten does not know are ignored and named in the import message.

### Investor list

Required columns are in bold.

| Column        | Meaning                                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| investor_id   | Your ID for the investor. Filled in for you if blank, with a new ID at every import. Keep your own IDs if you may import the list again.                                                                                                                                                         |
| **name**      | The investor's name.                                                                                                                                                                                                                                                                             |
| email         | Used in the chase list. Must be a valid address if given.                                                                                                                                                                                                                                        |
| **reference** | The payment reference you give the investor. 1 to 3 parts of English letters and digits, separated by a space or one of - / \_ . and 3 to 20 letters and digits in total. Must be different for each investor.                                                                                   |
| **cash_due**  | Everything the investor should wire, **including any fees charged to them**, except the pro-rata platform fee, which is taken from the investment at closing.                                                                                                                                    |
| scheme        | none, SEIS or EIS.                                                                                                                                                                                                                                                                               |
| own_fee_mode  | Optional. on_top or deducted: this investor's own fee terms replace the deal's investor-paid fees (see [Closing allocation](https://vegeta-ops.vercel.app/docs/goten/use/closing-allocation.md#an-investors-own-fee-terms)). Required if a rate or fixed fee is given.                                                                        |
| own_fee_rate  | Optional. The investor's own fee as a percentage. Below 100% when deducted.                                                                                                                                                                                                                      |
| own_fee_fixed | Optional. The investor's own fee as a fixed amount, above 0. Fill in a rate or a fixed fee, not both.                                                                                                                                                                                            |
| carry         | Optional. The investor's own carry rate at exit, such as 20 or 20%. With a fixed carry rate, blank means the deal's carry and 0 means none; with tiered carry the tier table decides, and every carry must be blank or all the same (see [Personal carry](https://vegeta-ops.vercel.app/docs/goten/use/exit-distribution.md#personal-carry)). |
| refunded      | Optional. What has already been refunded to the investor, or is on its way. Received amounts use the net figure.                                                                                                                                                                                 |
| refund_only   | Optional. withdrawn or closed: all of the investor's money goes back and they are not carried into the allocation. See [Reconciliation](https://vegeta-ops.vercel.app/docs/goten/use/reconciliation.md#refunds-already-made-and-refund-only-investors).                                                                                       |

Example, shown as a sheet:

| investor_id | name        | email               | reference | cash_due  | scheme |
| ----------- | ----------- | ------------------- | --------- | --------- | ------ |
| c01         | Amelia Hart | amelia@hart.example | NW-001    | 10,000.00 | SEIS   |
|             | Ben Okafor  | ben@okafor.example  | NW-002    | 5000      | EIS    |

Do not use a column called committed or commitment for cash due: it could mean with or without fees, so Goten refuses it unless a cash_due column is also present.

### Bank statement

| Column         | Meaning                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------- |
| transaction_id | The bank's ID for the line. Include it if you can: it is what stops duplicates on append. |
| **date**       | The date of the line.                                                                     |
| **amount**     | Money in is positive. Payments out and zero amounts are kept, skipped and listed.         |
| payer          | Who sent it.                                                                              |
| reference      | The bank reference. This is what automatic matching reads.                                |

### Allocation investors

For when you are not coming from reconciliation.

| Column       | Meaning                                        |
| ------------ | ---------------------------------------------- |
| investor_id  | Filled in for you if blank.                    |
| **name**     | The investor's name.                           |
| **received** | The cash actually received from this investor. |
| scheme       | none, SEIS or EIS.                             |

It also takes the optional `own_fee_mode`, `own_fee_rate`, `own_fee_fixed` and `carry` columns, with the same meaning as in the investor list.

### Holdings

For when you are not coming from the allocation.

| Column      | Meaning                                                                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| investor_id | Filled in for you if blank.                                                                                                                                                                                                                                           |
| **name**    | The investor's name.                                                                                                                                                                                                                                                  |
| **capital** | The amount invested, **excluding fees**. The split between investors follows this figure.                                                                                                                                                                             |
| share_price | Optional, the same on every row. Only used to show shares.                                                                                                                                                                                                            |
| carry       | Optional. The investor's own carry rate. With a fixed carry rate, blank means the deal's carry and 0 means none; with tiered carry the tier table decides, and every carry must be blank or all the same (see [Personal carry](https://vegeta-ops.vercel.app/docs/goten/use/exit-distribution.md#personal-carry)). |

A column called cost, paid or wired is refused unless a capital column is also present, because those can include fees. A holdings file exported from Goten can be imported back unchanged.

## Steps

1. Open the page and section from the first table. A section folds once it has a list; click its heading to open it.
2. Click the import heading, such as **Import investors (replaces the list)**, to open it.
3. For **Import bank statement**, choose under **When importing**:
   - **Replace the statement (clears your decisions)**, or
   - **Append (same transaction ID and details are ignored)**, for later statements.
4. Either click **Or choose a CSV file**, or paste the text into the box and click **Import pasted text**.

You can also type rows directly with **Add investor**, **Add bank line** and **Add holding**.

## What you should see

A green message such as **Imported 4 investors. Amounts read as GBP.** or **Replaced the statement with 5 lines. Amounts read as GBP.** It also lists **Ignored columns** if there were any, and on an append how many lines were **already imported (ignored)**.

An investor list import replaces the whole list. Decisions you made about receipts are checked against the new list; any whose investor changed are set aside for review.

Import the list again only with the same `investor_id` values. A different or blank ID counts as a new investor, even with the same name. Their confirmed decisions are set aside, any withdrawal mark is removed, so a withdrawn investor returns to the next hand-off with their money, and any fee payer adjustment to their amount is voided. If an import would do any of this, Goten first says how many decisions, withdrawal marks and fee payer adjustments it would void and offers **Import anyway** or **Cancel**. **Cancel** changes nothing.

## When it goes wrong

Any error in any row means **Nothing was imported**. Each error gives the row number (the column headings are row 1). Fix the file and import it again.

| Message                                                                 | Cause and fix                                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **header: missing required column "reference"**                         | Rename the column, or add it. The required columns are in bold above.                     |
| **column "committed" is not accepted.**                                 | Use cash_due, the full cash the investor should wire.                                     |
| **row 2, cash_due: "1,23" is not an amount**                            | Commas must group in threes.                                                              |
| **row 2: has 4 cells but the header has 3 — check for unquoted commas** | An amount like 1,000 needs quotes in a CSV, or no comma.                                  |
| **row 2, reference: must be 3–20 letters and digits**                   | The reference is too short or too long.                                                   |
| **row 3, reference: same reference as row 2**                           | References must differ. NW-1 and nw 1 count as the same.                                  |
| **column "Amount Due (€)" is in EUR but this deal is in GBP**           | A currency in a heading must match the deal. Check **Currency** in **Deal settings**.     |
| **row 2, currency: "EUR" but this deal is in GBP**                      | A currency column must match the deal, or be blank.                                       |
| **row 2, cash_due: "€100" uses € but this deal is in GBP**              | Remove the symbol or change the deal's currency.                                          |
| **row 3, date: "32/10/2026" is not a real date**                        | Correct the date.                                                                         |
| **"A1" already exists with different details — import conflict**        | The same transaction ID came through twice with different data. Check which one is right. |
| **row 3, share_price: must be the same on every row**                   | One deal has one share price.                                                             |

If the deal is too big, Goten says so: up to 500 investors, 2,000 bank lines and 500 holdings per deal.
