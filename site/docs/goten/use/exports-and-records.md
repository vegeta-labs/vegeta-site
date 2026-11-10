# Exports, the activity log and where your data is stored

> Goten v1.3.1. Source: https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/use/exports-and-records.md

## Exports

Each button saves a CSV file to your computer. Nothing is uploaded. File names end with the deal's currency, for example ledger_GBP.csv.

| Button                      | Page                 | File         | Contents                                                             | Waits while                                                 |
| --------------------------- | -------------------- | ------------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Export ledger CSV**       | 1. Reconciliation    | ledger       | One row per bank line, its status, who it is booked to, who decided. | There are input errors.                                     |
| **Export chase list CSV**   | 1. Reconciliation    | chase_list   | Each investor who is short or unpaid, with the chase text.           | There are input errors.                                     |
| **Export allocation CSV**   | 2. Allocation        | allocation   | One row per investor: invested, shares, each fee, refund, status.    | There are input errors or blockers, a refund is flagged, or the page is out of date. |
| **Export holdings CSV**     | 3. Exit distribution | holdings     | Each holding. It can be imported again unchanged.                    | The holdings table has an error, or the page is out of date. |
| **Export distribution CSV** | 3. Exit distribution | distribution | One row per investor: distribution, profit, multiple.                | There are input errors or a shortfall, or the page is out of date. |
| **Export activity log CSV** | Activity log         | activity_log | Every log entry, oldest first.                                       | The log is empty.                                           |

**Copy closing confirmation** copies the summary for the lead, and waits for the same things as the allocation export.

A page marked **out of date** holds back its copy and exports until you hand off again: **Copy closing confirmation** and **Export allocation CSV** on the allocation page, **Export holdings CSV** and **Export distribution CSV** on the exit page.

Every export has a currency column as its last column. In text columns, a cell starting with = + - or @ is saved with a leading apostrophe, so that a spreadsheet does not treat it as a formula. Goten removes the apostrophe if you import the file again.

Only the investor list, bank statement, allocation investors and holdings can be imported. There is no export that restores a whole deal, and decisions, withdrawals, fee payer changes and the activity log cannot be imported.

## The activity log

**Activity log** lists what happened on the deal, newest first: investor list and bank statement imports, every decision on a receipt, voided decisions, hand-offs, copied chase messages, withdrawals, fee payer changes, loading the sample, and exports of the log itself. Not logged: importing allocation investors or holdings, the other five exports, **Copy closing confirmation**, and editing a table cell, unless the edit voids a decision.

Set **Your initials** in **Deal settings** to have them added to each entry.

The log is read-only. It is a working record kept in this browser, not a regulatory ledger: anyone using this browser can clear it. Goten shows a warning once it holds 4,000 entries. Past 5,000 entries the oldest are removed, and a truncated line shows how many went and whether they had been exported. Export it regularly if you need to keep a full copy.

**Load sample deal** replaces the log with one entry for loading the sample. **Clear all data** empties it.

## Where your data is stored

Your deal stays in your browser. Goten processes it there and saves it in the browser's local storage for this site, and the app sends none of it anywhere. There is no account and no server holding your deals. Nothing is put in a page address. The site that hosts Goten still receives normal page requests, the same as for any website.

That has practical effects:

- The deal is only in this browser on this computer. It does not follow you to another device or browser.
- Clearing your browser's site data deletes it. So does **Clear all data**, and that cannot be undone.
- Anyone who can use this browser profile can see it. On a shared computer, clear the data when you finish.
- Goten holds one deal at a time. **Load sample deal** replaces it, after asking if there is anything to lose.
- A private window can lose the data when it closes.

If the browser cannot save, Goten tells you at the top of the page:

| Message                                                                                                    | What to do                                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **This browser is not saving your data (storage is blocked), so it will be gone when you close the page.** | Allow site data for this site, or export what you need before closing.                                            |
| **This browser's storage for this page is full, so your latest changes are not being saved.**              | Export what you need before you close the page. Goten removes the oldest log entries first to keep the deal data. |

## Real investor data and AI tools

Goten keeps deal data in the browser, but that protection ends when you copy the data out.

If you paste real investor names, emails, amounts or bank details into an AI chat or coding tool, or attach an export or a screenshot, that data leaves your browser and goes to that provider under their terms. Goten cannot see or stop it. Check that your firm allows it first. To ask for help, use the sample deal instead, or remove anything that identifies a person.

The same goes for the **Send feedback** link in the footer: please do not send real investor information.
