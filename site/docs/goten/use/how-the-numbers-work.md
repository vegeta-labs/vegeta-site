# How the numbers work

> Goten v1.3.1. Source: https://github.com/vegeta-labs/goten/blob/e9cab3e02360001967b9fc471cb40ec75fd6962b/docs/en/use/how-the-numbers-work.md

These are the rules Goten uses, in plain language. The examples come from the built-in Northwind Robotics deal.

## General rules

- **Money is exact.** Goten holds money as whole pence and does the maths exactly, without the small errors spreadsheets can build up.
- **Rounding is half-up**: an exact half-penny rounds up. The exceptions below say so.
- **Pro-rata splits add up exactly.** The pennies left after rounding down go to the largest remainders; if two are equal, to the person earlier in the list.

## How receipts are matched

Goten removes ordinary keyboard spaces and punctuation and ignores letter case, then checks whether the bank reference contains an investor's payment reference, across up to three neighbouring parts of it. Special characters, such as a long dash (–), count as part of the reference, so a line using one may need matching by hand.

A receipt is booked automatically only when exactly one investor matches and the line is not a possible duplicate.

For everything else, each investor gets a score between 0 and 1, built from:

| Reason                    | Points                                                         |
| ------------------------- | -------------------------------------------------------------- |
| Reference matches exactly | 0.60                                                           |
| Reference nearly matches  | 0.25: one character different, or the same number              |
| Payer name matches        | Up to 0.30, by the share of name words that match              |
| Amount matches            | 0.25: the amount equals their cash due, or what they still owe |

Only investors with a score of 0.30 or more are shown, and at most three. In the sample, Kavya Iyer's receipt with the reference NW 11 scores 0.80: 0.25 for a near reference, 0.30 for the payer name and 0.25 for the amount.

**Received** is the sum of the receipts booked to an investor. **Difference** is received minus cash due.

## Closing allocation

**What an investor can invest** is rounded down to the penny, from the cash they sent, any percentage fee rate and any fixed fee per investor.

- **Deducted from the money wired**: (received − fixed fees) × (100% − fee rate).
- **Added on top of the investment**: (received − fixed fees) ÷ (100% + fee rate).

In the sample, Amelia received £10,000.00 with a 3% fee deducted, so she invests £9,700.00. With the fee added on top, she invests £9,708.73.

**The minimum commitment** is checked against cash received when fees are deducted, and against the amount invested when fees are added on top. Anyone below it is out.

**If the total is over the round cap**, the cap is split between investors in proportion to what each could invest. If that puts anyone below the minimum, the deal cannot close.

**Each percentage fee** is worked out on its own and rounded half-up.

- Deducted: amount invested × fee rate ÷ (100% − total fee rate).
- On top: amount invested × fee rate.

**The refund** is received − invested − fees. If separate rounding of several fees would make it negative, the investment drops by a penny at a time until it is not. An investor who ends up investing nothing is out.

Anyone out pays no fees and gets everything back.

**Shares** are the amount invested ÷ share price, cut off at 6 decimal places. This is for display only. Amelia's £9,700.00 at £2.4137 is 4018.726436 shares.

**SEIS and EIS claimable** rounds down to whole shares. The claimable amount is those shares × the share price, rounded down to the penny, and whatever remains is **not claimable**. For Amelia that is 4,018 shares and £9,698.24, leaving £1.76.

**Company-paid and lead-paid percentage fees** are total invested × rate, rounded half-up. **Wire to company** is total invested − company-paid fees. Lead-paid fees are invoiced to the lead and do not affect the wire.

## Exit distribution

The money is paid out in this order:

1. **Exit costs** come off the proceeds. If they are more than the proceeds, nothing can be distributed.
2. **Return of capital**: investors get back what they invested, or everything that is left if it is less. If it is not enough, there is no carry.
3. **Hurdle**, with fixed carry: amount invested × ((1 + hurdle rate) to the power of years − 1). It is worked out exactly and rounded once, half-up. If less is left, investors get what remains.
4. **Catch-up**, if set: a band of (carry rate × hurdle paid ÷ (catch-up rate − carry rate)), rounded half-up, or whatever is left if that is less. The lead takes the catch-up rate of it and investors take the rest.
5. **Carried interest split**: the lead gets the carry rate of what remains, rounded half-up, and investors get the rest.

In the sample, the hurdle is £100,395.00 × (1.08⁶ − 1) = £58,919.25. The catch-up band is 20% × £58,919.25 ÷ 80% = £14,729.81, all to the lead at 100%. That leaves £211,455.94, of which the lead takes 20%. Carry comes to £57,021.00, which is 20% of the £285,105.00 profit.

**Tiered carry** has no hurdle or catch-up. Each band's rate applies only to the profit inside it. Band edges are (multiple − 1) × amount invested, rounded half-up to the penny, and each band's carry is rounded half-up.

**Between investors**, the total to investors is split in proportion to the amount each invested, not what they wired, so entry fees do not skew it. The pro-rata rule above applies. **Multiple** is distribution ÷ amount invested, rounded half-up to two decimals, and does not count entry fees.

## Changing who pays a fee

Each investor keeps the investment their commitment buys under today's fees.

Goten works out what each investor would invest if they paid exactly their cash due under today's fees. It then finds the smallest amount, to the penny, that buys the same investment once the fee has moved. The difference is the top-up or refund.

For example, with one 3% fee deducted, cash due £1,000.00 invests £970.00. When the fee moves from investors to the company, their new cash due is £970.00, a £30.00 refund. Moving a 3% fee the other way, a £1,000.00 investment needs £1,030.93.

## When a check fails

Every result carries **Checks**, of four kinds:

| Kind             | What happens                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Self-check**   | Arithmetic that must hold. If one fails, no figures are shown and you see an internal error. Please report it, without real investor data. |
| **Blocker**      | The result is shown so you can see why, but export and hand-off wait.                                                                      |
| **Needs review** | The result is shown, but the hand-off waits for a person.                                                                                  |
| **Reminder**     | The result is shown and nothing is stopped.                                                                                                |

Input errors are separate: if a required field is blank or badly formatted, no result appears at all. A blank is never treated as zero.
