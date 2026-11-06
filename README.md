# Digital Democracy participation prototype

A Vite + React + TypeScript demonstration of proposal review, personal voting, and section suggestions.

## Run

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `/voting` opens proposals, `/dashboard` opens the participation dashboard, and `/history` opens vote history. The landing page remains at `/`.

```sh
npm run build
npm run lint
npm test
```

For a local network-interface restriction, use `npm run dev -- --host 127.0.0.1`.

## Working behavior

- Shared, versioned sample proposals with full section wording.
- Search by ID, title or summary; filter by category.
- Support, Oppose, or Abstain on a complete proposal version; change a vote without losing earlier choices.
- Personal chronological history, distinguishing current and previous votes. Re-selecting the current choice does not create another entry.
- Suggestions tied to a proposal, version, and section. These do not modify published wording or count as amendment votes.
- Browser persistence for this single demo participant, including explicit errors for corrupt or unavailable storage.
- Keyboard labels, visible focus indicators, responsive portal layout, and an honest demo entry screen without collecting credentials.

## Boundaries and next milestones

This is a single-participant local demonstration. Browser storage can be edited or cleared and does not synchronize across devices. It is not identity verification, an authenticated account, a secure ballot receipt, an aggregate tally, or a real election service. Sample proposal wording is illustrative. No private participant data or production keys are included.

Next: new proposal submission, amendment voting and revision publication, followed by a separately specified backend and identity/privacy architecture. The NBPA income model is a later workstream; existing payment/access pages are placeholders.

Stale-tab writes are rejected and the latest saved record is loaded for review. This is a basic conflict check, not transactional multi-user storage; simultaneous cross-tab writes are not fully coordinated.

## Recovery

Keep completed work committed to GitHub. A fresh machine can recover it with:

```sh
git clone https://github.com/nickchadwick88/digital-democracy-portal.git
cd digital-democracy-portal
npm ci
npm run dev
```

For work on a feature branch, check out that branch before installing. Review and merge the milestone pull request to make it part of `main`.
