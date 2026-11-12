# Use Goten

> Goten v1.4.0. Source: https://github.com/vegeta-labs/goten/blob/c915491596deb01b3ce527c53e1ed3be738451be/docs/en/use/README.md

Goten is the deal calculations module of Vegeta. It takes one SPV or syndicate deal through three steps in your browser: payment reconciliation, closing allocation and exit distribution.

These pages are for operations staff. You do not need to install anything or write code.

## Start here

1. [Walk the sample deal](https://vegeta-ops.vercel.app/docs/goten/use/getting-started.md): go through all three steps with the built-in Northwind Robotics deal.
2. [Prepare and import your CSV files](https://vegeta-ops.vercel.app/docs/goten/use/import-csv.md): investors, bank statement, allocation investors and holdings.

## The three steps

- [Reconciliation](https://vegeta-ops.vercel.app/docs/goten/use/reconciliation.md): match bank receipts to investors and chase what is missing.
- [Closing allocation](https://vegeta-ops.vercel.app/docs/goten/use/closing-allocation.md): work out what each investor invests, pays in fees and gets back, and what is wired to the company.
- [Exit distribution](https://vegeta-ops.vercel.app/docs/goten/use/exit-distribution.md): split exit proceeds between investors and the lead, with costs, a hurdle and carry.

## Before closing

- [Withdrawing an investor and changing who pays a fee](https://vegeta-ops.vercel.app/docs/goten/use/withdrawal-and-fee-payer.md)

## Records and rules

- [Exports, the activity log and where your data is stored](https://vegeta-ops.vercel.app/docs/goten/use/exports-and-records.md)
- [How the numbers work](https://vegeta-ops.vercel.app/docs/goten/use/how-the-numbers-work.md): the calculation and rounding rules in plain language.

## What Goten does not do

Goten calculates and explains. People decide and act.

- It does not move money, connect to a bank or send email. Messages are copied for you to send yourself.
- A deal has one currency. Amounts are never converted.
- A deal has one investment and one exit, with the same terms for every investor.
- Every deal is a nominee SPV: the SPV holds the shares as nominee under a bare trust, and investors hold a beneficial interest, which can be a fraction of a share.
- Withdrawals and fee payer changes are for before closing only.
- It does not decide SEIS or EIS eligibility. Schemes are labels you enter.
- It does not give legal, tax or investment advice. It is software, not a regulated service. Check every result yourself before you rely on it.

If you run or modify Goten yourself, see [Run and build](https://vegeta-ops.vercel.app/docs/goten/build.md).
