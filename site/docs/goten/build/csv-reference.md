# CSV reference

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/build/csv-reference.md

Everything here comes from `src/lib/csv.ts`, `src/lib/money.ts`, `src/lib/validate.ts`, `src/lib/reconcile.ts` and `src/lib/exports.ts`. Sample files for each import are in `fixtures/`. For operations staff, see [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md).

## File rules

These apply to every import.

- UTF-8 with commas. A byte-order mark is removed. Fields can be quoted; a quoted field can contain commas and line breaks.
- LF, CRLF and CR line endings are all accepted, mixed if necessary.
- The first non-blank line is the header. Blank lines and rows of empty cells are skipped.
- Imports are atomic: any error means nothing is imported, and every error is listed with its row number. Row numbers are real file lines; the header is usually row 1.
- Every row must have exactly as many cells as the header.
- Unknown columns are ignored and named in the success message.
- Two columns that map to the same field are an error: `two columns map to "cash_due"`.
- Identifier and parsed fields lose leading and trailing ASCII whitespace; a cell of only whitespace counts as blank. Free text (names, payers, bank references) is kept as written.

## Column matching

Header names are compared after lower-casing and trimming, with any currency label removed first. Each file accepts the column name or any alias.

### Investor list

| Column        | Required | Aliases                                                 | Format                                                                                                                                        |
| ------------- | -------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `investor_id` | No       | `id`, `investor id`                                     | Up to 40 characters, unique when not blank. Generated if blank.                                                                               |
| `name`        | Yes      | `investor name`, `investor`, `full name`                | Up to 120 characters.                                                                                                                         |
| `email`       | No       | none                                                    | One `@` with text either side and no spaces, up to 200 characters.                                                                            |
| `reference`   | Yes      | `payment reference`, `ref`                              | 1 to 3 segments of `A–Z a–z 0–9`, joined by exactly one of space `-` `/` `_` `.`, 3 to 20 characters once normalised. Unique once normalised. |
| `cash_due`    | Yes      | `cash due`, `amount due`, `expected`, `expected amount` | Amount, greater than 0.                                                                                                                       |
| `scheme`      | No       | `tax scheme`, `seis/eis`                                | `none`, `SEIS` or `EIS`, any case. Blank means `none`.                                                                                        |

Normalising a reference removes separators and upper-cases `a–z`, so `nw 001` and `NW-001` are the same reference.

### Bank statement

| Column           | Required | Aliases                                         | Format                                                           |
| ---------------- | -------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `transaction_id` | No       | `id`, `transaction id`, `txn id`                | Up to 80 characters.                                             |
| `date`           | Yes      | `value date`, `booking date`                    | Date.                                                            |
| `amount`         | Yes      | `credit`, `paid in`                             | Amount. Negative and zero are accepted, then skipped and listed. |
| `payer`          | No       | `payer name`, `counterparty`, `from`, `name`    | Up to 200 characters.                                            |
| `reference`      | No       | `description`, `payment reference`, `narrative` | Up to 200 characters.                                            |

Importing with **Replace** clears decisions. **Append** ignores a row whose transaction ID is already present with the same date, amount, payer and reference; the same ID with different details is an error. Lines with no transaction ID are never de-duplicated, but two identical ones are flagged **Possible duplicate import**.

### Allocation investors

| Column        | Required | Aliases                                  | Format                |
| ------------- | -------- | ---------------------------------------- | --------------------- |
| `investor_id` | No       | `id`, `investor id`                      | As above.             |
| `name`        | Yes      | `investor name`, `investor`, `full name` | Up to 120 characters. |
| `received`    | Yes      | `cash received`, `amount received`       | Amount, 0 or more.    |
| `scheme`      | No       | `tax scheme`, `seis/eis`                 | As above.             |

### Holdings

| Column        | Required | Aliases                                  | Format                                                                                                      |
| ------------- | -------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `investor_id` | No       | `id`, `investor id`                      | As above.                                                                                                   |
| `name`        | Yes      | `investor name`, `investor`, `full name` | Up to 120 characters.                                                                                       |
| `capital`     | Yes      | `invested`, `amount invested`            | Amount, greater than 0. The amount invested, excluding fees.                                                |
| `share_price` | No       | `price per share`, `price`               | Share price, the same on every row. A blank on one row while others have a value is an error. Display only. |

`shares_display`, which the holdings export adds, is ignored on import.

### Columns refused

These names could include or exclude fees. If the required column is missing, they get a specific error; if the required column is present, they are ignored like any other extra column.

| Header                    | Field      | Error says                                                       |
| ------------------------- | ---------- | ---------------------------------------------------------------- |
| `committed`, `commitment` | `cash_due` | `column "committed" is not accepted. Use a "cash_due" column: …` |
| `cost`, `paid`, `wired`   | `capital`  | `column "cost" is not accepted. Use a "capital" column: …`       |

## Value formats

| Type                     | Rule                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amount                   | Digits with up to 2 decimals. Thousands commas must group in threes. One optional symbol that matches the deal. A minus sign only on bank amounts. Up to 1,000,000,000. |
| Date                     | `YYYY-MM-DD` or `D/M/YYYY` (day first; one or two digits). Dates that do not exist are errors.                                                                          |
| Share price              | Up to 6 decimals, greater than 0, up to 1,000,000. Thousands commas and a deal-currency symbol are allowed.                                                             |
| Percent, in table cells  | 0 to 100, up to 2 decimals, optional `%`.                                                                                                                               |
| Multiple, in table cells | Greater than 1, up to 2 decimals, optional `x`.                                                                                                                         |
| Years, in table cells    | 0 to 50, up to 2 decimals.                                                                                                                                              |

A blank or malformed required value is always an error, never zero.

Limits per deal: 500 investors, 2,000 bank lines, 500 holdings, 20 fees.

## Currency rules

A deal has one currency: GBP, EUR or USD. Display symbols are `£`, `€` and `US$`.

**In an amount or share price cell.** The symbol must match the deal. For a USD deal both `$` and `US$` are accepted. Otherwise: `"€100" uses € but this deal is in GBP`.

**In a header.** A label is read in two forms, case-insensitively: a bracket at the end, or a trailing word.

| Form          | Accepted labels                                         | Example, GBP deal |
| ------------- | ------------------------------------------------------- | ----------------- |
| Bracket       | `(£)`, `(gbp)`, `(€)`, `(eur)`, `($)`, `(us$)`, `(usd)` | `Amount Due (£)`  |
| Trailing word | ` gbp`, ` eur`, ` usd`                                  | `amount due gbp`  |

The label is checked first. If it names a currency other than the deal's, the import fails: `column "Amount Due (€)" is in EUR but this deal is in GBP`. If it matches, it is removed and the rest of the header is matched as usual. A bracket that is not a currency, such as `amount (net)`, stays part of the name, which then does not match and is ignored.

**In a currency column.** Any import can carry a column named `currency` or `ccy`. A non-blank cell must equal the deal's ISO code in any case, or the row fails: `row 2, currency: "EUR" but this deal is in GBP`. Blank means the deal's currency. Two currency columns are an error.

Changing a deal's currency in **Deal settings** never converts amounts.

## Exports

Every export ends with a `currency` column. It holds the deal's current ISO code, except in the activity log, where each row keeps the currency at the time of that event. Amounts are plain decimals without separators, except in the activity log.

| File                     | Columns                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ledger_<CUR>.csv`       | `transaction_id`, `date`, `amount`, `payer`, `reference`, `status`, `investor_id`, `investor_name`, `decided_by`, `withdrawn_on`, `currency`                                                                         |
| `chase_list_<CUR>.csv`   | `investor_id`, `name`, `email`, `committed`, `received`, `difference`, `status`, `committed_original`, `committed_adjustment`, `message`, `currency`                                                                 |
| `allocation_<CUR>.csv`   | `investor_id`, `name`, `scheme`, `received`, `invested`, `units`, one `fee_<fee name>` per investor-paid fee, `fees_total`, `refund`, `seis_eis_claimable_shares`, `seis_eis_claimable_amount`, `status`, `currency` |
| `distribution_<CUR>.csv` | `investor_id`, `name`, `capital`, `shares_display`, `distribution`, `profit`, `multiple_excl_entry_fees`, `currency`                                                                                                 |
| `holdings_<CUR>.csv`     | `investor_id`, `name`, `capital`, `shares_display`, `share_price`, `currency`                                                                                                                                        |
| `activity_log_<CUR>.csv` | `seq`, `time`, `initials`, `event`, `investor_id`, `investor_name`, `transaction_id`, `amount`, `detail`, `currency`                                                                                                 |

Status values:

- Ledger: `auto`, `confirmed`, `suggested`, `unmatched`, `rejected`, `skipped`, `future`. `decided_by` is `auto`, `person` or blank.
- Chase list: `partial`, `outstanding`. `committed` is the cash due after any fee payer change; `committed_original` and `committed_adjustment` are filled only when it differs from the list.
- Allocation: `allocated`, `scaled-back`, or for investors out of the close `no-funds`, `fees-exceed-receipt`, `below-minimum`, `zero-investment`.

Activity log events: `import`, `confirm`, `assign`, `not_in_deal`, `undo`, `decision_voided`, `withdrawn`, `withdrawal_undone`, `withdrawal_voided`, `handoff_allocation`, `handoff_exit`, `fee_payer_changed`, `fee_payer_change_reversed`, `fee_payer_change_voided`, `adjustment_voided`, `log_exported`, `message_copied`, `sample_loaded`. The `amount` column uses thousands separators and no symbol. A `truncated` row with an empty `seq` appears first if entries were removed.

Formula safety: text cells beginning with `=`, `+`, `-`, `@`, a tab, a carriage return or an apostrophe get a leading `'`. Numeric columns the app generates are written as they are. Import removes exactly one such apostrophe, so exported text comes back unchanged. Only the four formats at the top of this page can be imported.
