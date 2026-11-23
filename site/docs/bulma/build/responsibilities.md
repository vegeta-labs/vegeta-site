# Who does what

> Bulma v0.1.0. Source: https://github.com/vegeta-labs/bulma/blob/e0166a67c51edebce77f91d0d53c208b292cdebb/docs/en/responsibilities.md

This software leaves most compliance work with the operator. "Nobody" means this version has no control for it at all. If you run this for real, that gap is yours to fill.

This page describes the current version: sign-in, roles, modes, packs, the audit log, investor eligibility and KYC review, deals, invitations, commitments, signing, payment instructions, recording money, refunds, complaints and content approval. Closing a deal is not built yet.

| Control | Software does | Operator does | Nobody |
|---|---|---|---|
| Sanctions and PEP screening, and rescreening | Records the operator's KYC decision only | All screening, outside the software | |
| Ongoing monitoring and suspicious activity reports | | All of it, outside the software | |
| Client money reconciliation | Matches an imported bank statement against what is due, by reference; a person decides each line | Holds the money, reconciles against the bank, decides | |
| Offline and social media promotion | | Approves and controls it; the software never sees it | |
| Appointed representative oversight | | | **Nobody: this version cannot be used for appointed representatives** |
| Complaints and incidents | Records a complaint and keeps it on the operator's to-do list until it is acknowledged | Handles them and reports where required | |
| Training | | All of it | |
| Keeping legal text up to date | Versions the text and refuses text that still looks like a shipped placeholder in the real mode | Writes the text with its lawyers and keeps it current | |
| Approving promotions | Records an internal content approval and blocks unapproved content (a sandbox checks only when the operator turns this on) | Decides who may approve; the record is not a statutory approval | |
| Two-person checks | Enforces a second admin on listed changes | Makes sure the accounts belong to different real people | |
| Regulatory status | Records what the operator states; does not check it | Holds the status it states | |
