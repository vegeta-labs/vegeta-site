# Walk the sandbox

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/use/getting-started.md

Take one fictional deal from a new instance to payment instructions, playing the operator, the lead and an investor in turn. Everything stays in the sandbox: no email leaves, no money moves and the payment details are a fixed fictional account.

## What you need

- A running instance in the sandbox, the mode every new instance starts in. To start one, follow [Try it](https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/README.md#try-it). On the computer that runs it, the address is http://127.0.0.1:8080.
- The first admin's email and the password in `secrets/initial_admin_password`.
- An authenticator app on your phone. Staff roles need two-step sign-in.
- Three small PDF, PNG or JPEG files of your own for the investor's proof documents, and one PDF for the deal's legal documents. Any content will do: use nothing real.

You play three people, one at a time, in the same browser. Click **Sign out** at the top of the page whenever you switch. The names and figures below are suggestions; use made-up details everywhere.

Bulma is software, not a regulated service. The legal texts and questions shipped with it are placeholders.

## Steps

### 1. Sign in as the admin

1. Open the instance. Every page shows **Sandbox: fictional data only. No email leaves this instance and nothing here is a real offer.**
2. Sign in with the first admin's email and password.
3. Under **Choose a new password**, fill in **Current password** and **New password** (12 characters or more), then click **Save**.
4. Under **Set up two-step sign-in**, type **Your password** and click **Start**. Scan the code with your authenticator app, type the **Code from the app** and click **Confirm**.
5. Keep the recovery codes and click **I have kept them**.

Next time you sign in as the admin, Bulma also asks for the **Code from your authenticator, or a recovery code**.

### 2. Get the instance ready

You are on **Home**, which holds the admin sections.

1. Under **Instance mode**, check that the mode is **Sandbox**.
2. Under **People and roles**, tick **reviewer** on your own row. **Deal review** appears in the menu. In the sandbox the change takes effect at once.
3. Under **Platform fee**, leave the five fields at 0 and click **Save a new version**. The section now says **Version 1: 0 bps, minimum 0, maximum 0 (minor units).** A deal cannot be submitted until a fee is set, and a fee of 0 is allowed.

Click **Sign out**.

### 3. Create the lead's account

1. Click **Create an account**. Fill in **First name**, **Last name**, **Email** and **Password (12+ characters)**, then click **Create account**.
2. The page says **Check your email**. No email leaves the sandbox, so click **Open the link here**.
3. Type **The password you chose when you registered** and click **Confirm**. Then click **Continue to sign in** and sign in.
4. On **Home**, under **Who you invest as**, leave **Type** as **Myself**. Fill in **Full name**, **Address**, **Tax residence** and **Tax ID**, and click **Add**. A deal needs this entity as its lead entity.

### 4. Set up the deal

Open **Deals** and click **Start a deal**. Each section is saved as you type, and its button shows **to finish** or **✓ done**. Fill in:

| Section | Fields |
|---|---|
| **Basics** | **Legal structure**: **UK bare trust**. **Deal type**: **Primary**. **Deal name**: Seedling Round. Choose **A new one**, give a **Syndicate name** and choose your entity as **Lead entity**. |
| **Company** | **Legal name**: Seedling Ltd. **Contact name**, **Contact email** and **Jurisdiction**: anything fictional. |
| **Terms** | **Currency**: **GBP**. **Instrument**: **Equity**. **Share price**: 0.015. **Pre-money valuation**: 5,000,000. **SPV allocation**: 300,000. **Default voter**: **The lead**. |
| **Files** | Under **Investment agreement and legal documents**, use **Add files** to add your PDF. |
| **Economics** | **Default carry (%)**: 20. Click **Add a recipient**, set **Type** to **A person**, fill in **First name**, **Last name** and **Email**, and set **Share of the carry (%)** to 100. **Who pays the platform fee**: **The investors, in proportion**. |
| **Review** | Under **Before you submit**, tick the box about board and shareholder approval. |

Still in **Review**, click **Submit for review**. The deal's status is now **With the reviewer**. Click **Sign out**.

The [Lead guide](https://vegeta-ops.vercel.app/docs/bulma/use/lead-guide.md#2-set-up-the-deal) explains every field.

### 5. Approve the deal

1. Sign in as the admin.
2. Open **Deal review**. Under **Deals waiting for review**, click **Seedling Round**.
3. Under **Your decision**, click **Approve**.

Click **Sign out**.

### 6. Go live and copy a link

1. Sign in as the lead and open **Deals**, then the deal. Its status is **Approved, waiting for the lead to confirm**.
2. Tick **I confirm this deal should go live** and click **Go live**. The status changes to **Live**.
3. On the **Investors** card, under **Links**, find **Default carry, no fee** (not **No carry, no fee**) and click **Show link**.
4. Copy the link that appears and keep it. In the default setup it is only a path starting with `/invite`: put the instance address in front, for example `http://127.0.0.1:8080/invite?token=…`.

Click **Sign out**.

### 7. Open the invitation as an investor

1. Open the link you copied. The page shows **You have been invited** and an invitation reference, but nothing about the deal.
2. Click **Sign in or create an account**, and create a new account as in step 3. Your browser remembers the invitation and adds it to the account.
3. On **Home**, the **Eligibility** card lists your steps. Under **Which describes you?**, choose **High net worth**. Answer **Yes** to the income question and type 100,000 under **Income, to the nearest £10,000**; answer **No** to the net assets question. Type your name under **Your full name, as your signature** and click **Sign**.
4. Click **Start the assessment**. In the template pack the right answer to every question is **Placeholder option A**. Choose it each time and click **Send answers**.
5. Read the risk warning and click **I have read this**. The card says **You have finished these steps.**

Under **Your deals**, **Seedling Round** is now a link. The [Investor guide](https://vegeta-ops.vercel.app/docs/bulma/use/investor-guide.md#3-eligibility) explains the other answers.

### 8. Send your identity for review

1. Under **Who you invest as**, add an entity of the type **Myself**, as the lead did in step 3.
2. On the entity, add a file for **Identity proof**, **Address proof** and **Source of wealth**. Leave the bank account fields empty.
3. Tick **This information is true** and click **Send for review, no face scan**. The status changes to **In review**.

Click **Sign out**.

### 9. Pass the identity check

1. Sign in as the admin.
2. On **Home**, under **Identity checks waiting**, find the investor's entity and click **Open the case**. You can open each file.
3. Click **Pass the documents**.

Click **Sign out**.

### 10. Commit, sign and see the payment details

1. Sign in as the investor. The entity's status is **Passed**.
2. Under **Your deals**, click **Seedling Round**. The deal page starts with the risk warning.
3. Under **Invest**, type 10,000 as the **Amount** and click **Show what I would pay**.
4. Choose your entity under **Who is investing** and click **Commit £10,000.00**. The status is **To sign**.
5. Click **Deal sheet**. Tick **I have read this document and agree to sign it.**, fill in **Type your full name to sign** and click **Sign**.

The payment details open. They show **Still to pay: £10,000.00**, your **Payment reference** and **How the amount is made up**. Under **Receiving account** is the sandbox's fictional account: Fictional Sandbox Account, sort code 00-00-00, account number 00000000, holder Fictional Holder Ltd. Do not send money to it.

Click **I have paid**. The page now says **You said you have paid. The operator records money when it arrives.** This tells the lead; it is not a receipt.

## When you are finished

- To see what the sandbox would have emailed, sign in as the admin and open **Sandbox outbox** on **Home**.
- Recording the money that arrives is the operator's work: see [Money](https://vegeta-ops.vercel.app/docs/bulma/build/operator-guide.md#money) in the operator guide.
- To learn each role properly, go on to the [Lead guide](https://vegeta-ops.vercel.app/docs/bulma/use/lead-guide.md) and the [Investor guide](https://vegeta-ops.vercel.app/docs/bulma/use/investor-guide.md).

## When it goes wrong

| What you see | What to do |
|---|---|
| **The operator has not set the platform fee yet. A deal cannot be submitted until it is set.** | Sign in as the admin and save a fee, as in step 2. |
| **Add an investing entity on your home page first.** | The lead needs an entity on **Home** before choosing a **Lead entity**. |
| **Deal review** is not in the menu | Tick **reviewer** for the admin under **People and roles**, as in step 2. |
| **This link does not work. Ask whoever sent it for a new one.** | Go back to step 6 and copy the link again. Check that it was not turned off. |
| **You can sign once your identity check has passed.** | The admin has not passed the investor's identity check yet. Do step 9. |
