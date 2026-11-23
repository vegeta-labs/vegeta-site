# Lead guide: set up a deal, invite investors, follow up

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/use/lead-guide.md

A lead is anyone with an account who starts a deal. There is no separate lead account: the same account can also invest. The operator's reviewer checks every deal before it goes live.

## What you need

- An account with a confirmed email address.
- An investing entity, added on **Home** under **Who you invest as**. A syndicate needs one as its **Lead entity**.
- The operator must have set a platform fee. Until then, **Economics** says **The operator has not set the platform fee yet. A deal cannot be submitted until it is set.**

## 1. Create a syndicate

Open **Syndicates** and fill in **Create a syndicate**: **Name** and **Lead entity**, then **Create the syndicate**. You become its admin. You can also create one inside a deal: in **Basics**, choose **A new one**. It is created only when you submit the deal.

On the syndicate page, **Invite people** makes a member link: **Deal member: sees only deals they are added to** or **Admin: sees every deal**. The link is shown once: copy it yourself. **Stop this link** turns it off.

## 2. Set up the deal

Open **Deals** and click **Start a deal**. The deal has six sections, which you can fill in any order. Each is saved as you type and shows **✓ done** or **to finish**.

- **Basics**: legal structure, deal type, **Deal name** (investors see it) and the syndicate.
- **Company**: legal name, website, contact name and email, jurisdiction. The contact is sent a link for the company's documents once you submit.
- **Terms**: currency (nothing is converted), SEIS or EIS, round, instrument, price or valuation, **SPV allocation**, **Minimum commitment**, **Minimum raise**, dates, **Default voter** and **Custom terms**. Ticking SEIS or EIS records what you say: the software does not judge whether the company qualifies. The **Payment deadline** only sets when payment reminders stop: nothing else happens on that day. **When the allocation is full** is **Tell me and keep accepting** or **Stop and start a waiting list**.
- **Files**: an optional **Memo** and **Pitch deck** (a PDF up to 10 MB, or a link), and at least one investment agreement or legal document (PDF or Word). Files are virus-scanned. An external deck link is not behind the eligibility steps.
- **Economics**: **Default carry (%)**, **Who receives the carry** (shares must add up to 100%) and **Who pays the platform fee**. The final investment amount is exact only at closing.
- **Review**: a summary, **Still to do**, and the **Before you submit** confirmation about board and shareholder approval.

Click **Submit for review**. To add a co-lead or member from the syndicate, use **People on this deal**.

## 3. The company check

When you submit, the company contact gets a link to upload the company's documents without an account. The link works for 14 days unless the operator changed it. Your **Company check** card shows its status: **Waiting for the company**, **Sent, waiting for a reviewer**, **Passed** or **Sent back to the company**. You see how far it has got, not the documents.

**Remind the company** sends a new link; the old one stops working. Without a pass the deal can raise money, but cannot close.

## 4. Review and going live

| Status | Meaning |
|---|---|
| **Draft** | You are still writing it. |
| **With the reviewer** | Submitted. **Withdraw from review** takes it back to Draft. |
| **Changes asked for** | Read the reason, change the deal, then **Send back for review**. |
| **Not accepted** | Refused. This is final. |
| **Approved, waiting for the lead to confirm** | Tick **I confirm this deal should go live** and click **Go live**. |
| **Live** | Investors can be invited. Changes now go through **Change this deal** (see section 9). |

Editing a deal that is with the reviewer or approved starts the review again. If you do not confirm an approved deal in time (30 days unless the operator changed it), it goes back to Draft. On a real instance, and in the sandbox if the operator turned it on, an approver at the operator must also record that the content is approved before you can go live.

## 5. Invite investors

All of this is on the deal's **Investors** card. You can build the expected list before going live; links and invitations need a Live deal.

**Whom you may invite.** If the operator has written whom leads may invite, read it, tick **I have read this text (version** N**) and will invite only the people it allows** and click **Confirm**. Until you do, you cannot add people to the list or send an invitation. When the operator changes the text, you confirm again.

**Links.** Going live makes a default link with the deal's carry and no fee, and, where the operator allows links with their own terms, a second one with no carry and no fee. There is no second link when the deal's carry is already 0, or when the operator's rules ask for a reviewer's approval of different terms. If the operator allows only invitations to a named address, these links carry terms for your email invitations and cannot be opened by anyone. **New terms** makes a link with its own carry and cash fee, if the operator allows it; say why they differ and confirm they are not an incentive. Terms cannot be changed once saved, and some need a reviewer's approval before the link works. **Show link** shows a link anyone can open, for you to copy by hand. **Turn off** stops it: people bound to it who have not committed lose the invitation. Links do not expire and have no use limit; a deal can have up to 500 in use.

**Invite by email.** Give an address and the terms, then **Send invitation**. The email holds no details of the deal, and only an account that confirmed that address can use it.

**Expected investors.** Paste rows (name, email, expected amount, terms label, note) and click **Add to the list**. Expected amounts are what you typed, not commitments. To invite several people at once, pick terms for each row, click **Check before sending**, then the **Send** button, which shows how many will go. **Send again** replaces an earlier email invitation.

Under the links, a reminder counts the people invited by country. It never blocks anything. Do not promote the deal publicly.

## 6. Follow up

Each person on your expected list shows a status:

| Status | Meaning |
|---|---|
| **Not responded** | Not invited yet. |
| **Invited** | Invited, nothing more yet. |
| **Verifying** | Committed; their identity check has not passed yet. |
| **To sign** | Committed and checked; deal sheet not signed. |
| **To pay** | Signed; payment details are available to them. |
| **Payment sent** | They said they have paid. This is not a receipt. |
| **Part paid** / **Funded** / **Funded · refund due** | What the operator has recorded as received. |
| **Declined** | They said they will not invest. |
| **Reconfirm terms** / **Confirm amount** | They must answer changed terms or a new amount you proposed (section 7). |
| **With the operator** | The operator is handling something about them. You are not told what. |
| **No longer taking part** | Their invitation ended. |

People who came through a link but are not on your list show only as counts on that link.

- **Messages from investors** shows what investors sent with **Ask the lead**. To answer, write to them under **Messages to investors** (section 8).
- **Preview the default deal sheet** shows the operator's deal sheet filled in for this deal. You cannot edit it.
- **Download the list** exports your expected investors, only if the operator allows leads to export.

## 7. The investor list

Once the deal is live, **Investor list** shows everyone who committed, with figures for the deal: **Committed**, **Received**, **Refund due**, **Refunded**, **With the operator**, **Lead fees** and **Usable for the deal**. Filter by **Status** and by **Waiting on** (**The investor**, **A reviewer**, **The lead** or **Nobody**). Each row shows **Waiting on**, **Days at this step**, the commitment, what was received, the lead fee and the carry. **Download this list (CSV)** works only if the operator allows leads to export.

Besides the statuses in section 6, the list can show **Waitlisted**, **Removed**, **Withdrawn** and **Cancelled**. **no answer by the deadline** means someone did not answer changed terms in time.

**Actions for** a person opens what you can do for them. A button you cannot use says why under it.

- **Email**: write to this one person (section 8).
- **Signed documents**: what they signed, version by version.
- **Remove**: only while no money has arrived from them. If they said they have paid, first check with the operator where the money is and tick the box that says so. Your reason is kept in the record and not sent to them. They are told their commitment ended; if they had payment details, those stop being valid and the mail tells them not to pay.
- **Record a withdrawal**: once money has arrived. Paste their written consent and tick **They asked in writing to withdraw**, then **Send to a reviewer**. If a reviewer accepts, their commitment ends and the operator puts their refund on its list.
- **Change their link**: give someone who has not committed other terms. Once they commit, their terms are fixed.
- **Propose a new amount**: only while no money has arrived and they have not said they paid. They answer on their deal page; nothing changes until they accept. If they do not answer in time (set by the operator, in working days), the proposal ends and their commitment stays as it was.
- **Change their terms**: new carry or cash fee for one committed person, with one sentence they read. A reviewer decides; if approved, they are asked to reconfirm. While it waits, no other change to this deal can be sent.

**Waiting list.** If you chose **Stop and start a waiting list**, the **Closing and cancelling** card shows the room left in the deal and who is waiting. **Let them in** lets one person commit. Investors join and leave the list on the deal page.

## 8. Messages to investors

Under **Messages to investors**, write to a group (filter by status, **Waiting on** and whether they committed) or to one person, with **Subject** and **Message**, then **Save the message**. A message is a promotion: it opens with the risk warning and reaches only people who may see the deal today. Anyone else still taking part gets a notice with only a link to sign in. Replies go to your own email address.

If the message needs approval, an approver at the operator approves it first; changing it needs a new approval. Then click **Send**. The result says how many it went to and who was left out and why. **Messages sent through this site** keeps what was sent. Sending to many people at once works only if the operator turned it on.

## 9. Change a live deal

Click **Change this deal**, edit the sections, write **What changes and why, in one sentence (investors read it)** and click **Send this change**. **Stop without sending** drops it.

- A new target close date, payment deadline or choice for **When the allocation is full** is in force at once, and investors who committed are told.
- Every other change goes to a reviewer. Changes to what investors get, such as a higher price, the carry or the fees, always need reconfirming; for the rest the reviewer decides whether investors are only told or must reconfirm. Where the operator asks for content approval, an approver then approves it. Nothing changes for investors until then.
- The currency cannot change once anyone has committed.

**Changes after launch** lists each change and its state: **Waiting for a reviewer**, **Reviewed, waiting for approval**, **In force**, **Returned to you** or **Taken back**. **Take back this change** works while it waits. Only one change can wait at a time.

When investors must reconfirm, they agree or decline by a deadline in working days. Silence is not agreement. If someone does not answer in time and no money has arrived from them, you can remove them; if money has arrived, a reviewer decides.

## 10. Closing and cancelling

The **Closing and cancelling** card shows what is committed against the minimum raise, and **SPV allocation**, **Received**, **Lead fees** and **Estimated investment, before the platform fee**.

**Ask to close.** Under **Before you can ask to close:** the card lists what is missing. This includes your own identity check, the company check and the identity checks of the people who control the company, so start them early. When nothing is, tick the box and click **Ask to close**. Links stop taking new commitments, proposed amounts not yet answered end, and nobody more is let in from the waiting list. **Take back the request to close** reopens the deal.

**Cancel the deal.** **Ask to cancel the deal** shows what happens and any note from the operator on fees. Add a reason if you like and click **Send the request to cancel**. A reviewer must confirm it. Then every commitment ends, payment details stop being valid, investors are told not to pay, and money already received is refunded by the operator.

## What you cannot do yet

- Close a deal. Asking to close stops new commitments, but no version yet takes the deal on from there to completion.

Recording money and refunds is the operator's job, not the lead's.
