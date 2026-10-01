---
title: Implement FSRS vocabulary review
date: 2026-09-30
summary: "Schema migrated without a reset; sets, FSRS scheduler, review API and review screen implemented; API verified by curl, UI not yet exercised in a browser."
---

# Implement FSRS vocabulary review

## What happened

Executed `plans/260930-0640-fsrs-vocabulary-review` on branch `bone/feat/fsrs-vocabulary-review`.
Nothing is committed yet.

- The Neon database had an empty `_prisma_migrations` table and matched the old schema, so it was
  baselined (`0_init` marked applied) instead of reset. A `pg_dump` was taken first.
- `prisma migrate diff` produced an invalid enum step (it altered `status` before the column existed).
  The migration was rewritten to drop `learningstatus`, replace the enum, then add `status`.
- A second migration normalizes words saved before the new rule (one row changed).
- Server: `fsrs-scheduler.ts` (row ↔ ts-fsrs Card), `review-service.ts` (transaction, row lock,
  idempotent `clientReviewId`), set CRUD with Pro-gated generation, routes at `/api/vocabulary-set`
  and `/api/review`.
- Client: set list and set dialog on real data, `/review` screen, reader saves sentence and passage,
  translation is a session-cached query.

## Evidence

`pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec knip` pass. A curl pass with two temporary
users (deleted afterwards) covered normalization, ownership, set progress, the Pro gate, the due list
and daily limit, rating, resend, five parallel copies of one rating, lapse, session end, and cascade.

## Open

- Browser pass for the review screen, set dialog, and reader popup (Google sign-in only).
- Confirm `"PRO"` as the tier value and 50 as the generated-set cap.
- Other environments need `pnpm exec prisma migrate deploy`; a database with existing tables must
  first run `prisma migrate resolve --applied 0_init`.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
