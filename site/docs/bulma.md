# Use Bulma

> Bulma v0.2.0. Source: https://github.com/vegeta-labs/bulma/blob/0eac4d1c8e969aa7bf876540873df26b7b6c5379/docs/en/use/README.md

Bulma is the SPV Workspace module of Vegeta. A lead sets up an SPV deal, a reviewer at the operator checks it, and investors are invited by link or email. Investors confirm their eligibility, commit, pass an identity check, sign a deal sheet and get payment instructions.

These pages are for the people who use a Bulma instance: leads and investors. You do not need to install anything. An operator has to run the instance and review what happens in it. If that is you, see the [Operator guide](https://vegeta-ops.vercel.app/docs/bulma/build/operator-guide.md).

## Start here

- [Walk the sandbox](https://vegeta-ops.vercel.app/docs/bulma/use/getting-started.md): one fictional deal from a new instance to payment instructions, playing the operator, the lead and an investor.
- [Lead guide](https://vegeta-ops.vercel.app/docs/bulma/use/lead-guide.md): set up a deal, get it reviewed, invite investors, follow their progress, write to them, change a live deal, and ask to close or cancel.
- [Investor guide](https://vegeta-ops.vercel.app/docs/bulma/use/investor-guide.md): eligibility, committing, the identity check, signing, payment instructions, a proposed new amount, the waiting list, changed terms and leaving a deal.

## The sandbox

A new instance is a sandbox. Every page then starts with:

**Sandbox: fictional data only. No email leaves this instance and nothing here is a real offer.**

In the sandbox, emails are not sent. Where you would get one, the page shows you the link instead, or an admin reads it in the **Sandbox outbox**. Payment details are a fixed fictional account. Use made-up details everywhere.

## What Bulma does not do

- It never moves money, holds shares or runs a wallet. Investors pay the operator's account directly, and a person at the operator records what arrives.
- It does not decide for anyone. A person at the operator decides every identity check and every deal review. The software records what people state and does not verify it.
- Investment, legal and tax wording, such as the risk warnings and the deal sheet, comes from the operator. The texts shipped with the software are placeholders, not legal text.
- Closing a deal is not built yet: a lead can ask to close, but nothing takes the deal on to completion. Each guide says what else is missing for you.
