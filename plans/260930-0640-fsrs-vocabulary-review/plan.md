---
title: "Vocabulary spaced repetition with FSRS"
description: "Implement the vocabulary database redesign and FSRS review loop: word context, word sets, review sessions, and rating-driven scheduling with ts-fsrs."
status: in-progress
priority: P1
effort: 3d
branch: bone/feat/fsrs-vocabulary-review
tags: [feature, database, backend, frontend, api]
blockedBy: []
blocks: []
created: 2026-09-30
---

# Vocabulary spaced repetition with FSRS

## Overview

The word bank stores words and sets but cannot schedule reviews: a word has no
algorithm state, no review history, and no passage context. This plan implements
the accepted design (option A: FSRS columns on `VocabularyItem` plus a
`ReviewLog`), using `ts-fsrs` 5.x with its default parameters. It covers
US-10 (session translation cache), US-11, US-12, US-13, US-14, and US-15.

Design page: https://claude.ai/artifact/X6mYdiorTZF1yE3e3o2d3X
Requirements: [EP-04](../../docs/Requirements/epic-04-vocabulary-capture.md), [EP-05](../../docs/Requirements/epic-05-memorization-review.md)

## Contract

- **Outcome:** A learner saves a word with its sentence and passage, groups words
  into sets (by hand, or generated for Pro), opens a review session, rates each
  card Again / Hard / Good / Easy, and the server reschedules the card with FSRS
  and records a log row. Status is one of NEW / LEARNING / REVIEW / RELEARNING and
  only the scheduler writes it.
- **Constraints:** One review direction (EN → VI). Scheduling state lives on the
  word and is shared by every set. Scheduling settings live on `UserProfile`.
  Rating a card is one transaction and is idempotent on `clientReviewId`. Column
  names mirror the `ts-fsrs` `Card` type. Existing error envelope, `@/` alias,
  client/server/shared boundaries, and `validate()` / `requireSession` patterns
  stay as they are. Every phase leaves `pnpm typecheck`, `pnpm lint`,
  `pnpm build`, and `pnpm exec knip` green.
- **Non-goals:** Per-user FSRS parameter optimization (the `fsrsParams` column is
  added but nothing writes it). A settings UI or API for `desiredRetention`,
  `dailyNewLimit`, `timezone` (columns ship with defaults). Reverse or listening
  cards. Undoing a rating. Review statistics screens. Billing or a way to become
  Pro. Migrating existing vocabulary data (the database is a test environment).

## Decisions carried from the design

| Topic | Decision |
|---|---|
| Algorithm | FSRS through `ts-fsrs`, library default weights, `request_retention` from `UserProfile.desiredRetention` |
| State storage | Columns on `VocabularyItem`; one `ReviewLog` row per rating holding the state before the rating |
| Status | `VocabularyStatus` = NEW, LEARNING, REVIEW, RELEARNING, 1:1 with `ts-fsrs` `State`; no manual edit |
| Sets | Name plus members only; composite key on the join table; name unique per user |
| Generated set | A normal set; Pro only; due words first, then NEW words, up to N |
| Word identity | `(userId, term, translation)` after trim, whitespace collapse, lowercase |
| Context | First sentence and passage only; a duplicate save keeps the first context |
| Day boundary | Computed in `UserProfile.timezone` (default `Asia/Bangkok`) |

## Decisions made while planning

- **Routes:** sets at `/api/vocabulary-set`, review at `/api/review`, both in
  `src/server/modules/vocabulary/`. This avoids a clash with `/api/vocabulary/:id`.
- **`ReviewLog.learningSteps`:** one column added beyond the design's schema.
  `ts-fsrs` logs the learning step before the rating; without it the stored
  "state before rating" is incomplete for a later undo or replay.
- **Same-session repeats:** a card whose new `scheduledDays` is 0 (short learning
  step) goes to the back of the client queue and is shown again in this session,
  even if its step has not fully elapsed. The session ends when the queue is empty.
- **Pro check:** `user.tier === "PRO"`; generated set size is 1 to 50.
- **Tests:** the repo has no test runner, so verification is typecheck, lint,
  build, knip, and scripted `curl` checks per phase.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Schema and status contract](./phase-01-schema-and-status-contract.md) | Done | 4h |
| 2 | [Save context and translation cache](./phase-02-save-context-and-translate-cache.md) | Done | 3h |
| 3 | [Vocabulary sets](./phase-03-vocabulary-sets.md) | Done | 6h |
| 4 | [FSRS scheduler and review API](./phase-04-fsrs-scheduler-and-review-api.md) | Done | 6h |
| 5 | [Review screen and docs](./phase-05-review-screen-and-docs.md) | Code done, browser pass open | 6h |

Phase 1 blocks everything. Phases 2, 3, and 4 each depend only on phase 1 but
share `src/shared/api-error.ts`, `src/server/app.ts`, and the vocabulary page, so
run them in order. Phase 5 depends on phases 3 and 4.

## Success Criteria

- [x] Saving a word from the reader stores its sentence and passage; saving it again increments `savedCount` and keeps the first sentence.
- [x] "Run" and "run" with "Chạy" and "chạy" resolve to one row.
- [x] `PATCH /api/vocabulary/:id` with a `status` field does not change the status.
- [x] A set can be created, renamed, deleted, and have words added and removed; its card shows counts per status.
- [x] `POST /api/vocabulary-set/generate` answers 403 for a FREE user and creates an ordinary set for a PRO user.
- [x] `GET /api/review/due` returns due cards plus NEW cards capped by the daily limit for the user's local day.
- [x] Rating a card updates the card, writes one `ReviewLog` row, and increments `cardsReviewed` in one transaction; resending the same `clientReviewId` changes nothing.
- [x] Again gives a shorter next interval than Hard, Good, and Easy on the same card.
- [ ] The review screen shows the four buttons with their predicted intervals, the context sentence and passage link on the back, and an "all caught up" state with the start button disabled when nothing is due.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec knip` pass.

## Key Risks

- The database has no migration history. `prisma migrate dev` will report drift
  and offer a reset, which deletes every table including users and passages.
  Phase 1 takes a `pg_dump` first and stops for user confirmation before a reset.
- The deployed database needs the same migration; `pnpm build` does not run it.
- `ts-fsrs` type names are verified against documentation, not the installed
  package. Phase 4 starts by reading the installed `.d.ts`.
- Two ratings for one card racing each other would corrupt state; phase 4 locks
  the row inside the transaction.

## Open Questions

- Should the deployed database be reset, or baselined to keep its data?
- Is `"PRO"` the final value of `User.tier`, and is 50 the right cap for a generated set?

## Execution Log

### 2026-09-30

- **No reset was needed.** The database was baselined instead: `0_init` records the
  schema as it was and is marked applied; `20260930070000_vocabulary_spaced_repetition`
  carries the change. All existing rows were kept (2 users, 14 passages, 5 words).
  This answers the open question about reset versus baseline for this database.
- The generated enum step was invalid SQL (it altered `status` before the column
  existed), so the migration drops `learningstatus`, replaces the enum, then adds
  `status`. Every existing word was NEW, so nothing was lost.
- Added `20260930080000_normalize_vocabulary_text` so words saved earlier follow the
  new normalization rule (one row changed: "Hello / Chào").
- API verified with `curl` against the dev server using two temporary users, removed
  afterwards: normalization and first-context rule, ownership checks, set CRUD and
  progress, Pro gate, due list and daily limit, rating, idempotent resend, five
  parallel copies of one rating (one log row), lapse to RELEARNING, session end,
  cascade on word delete.
- Not verified: the review screen, set dialog, and reader popup in a browser.
  Sign-in is Google only, so the UI checks in phases 2, 3, and 5 remain open.
- **Set model changed after delivery (decision by the owner).** Sets now follow the
  Anki deck model: a word is in exactly one set (`VocabularyItem.vocabularySetId`),
  each user has a default set, `VocabularySetItem` is removed, and the daily
  new-word limit moved from `UserProfile` to `VocabularySet`. This supersedes the
  n–n relation and the per-user limit described in phases 1, 3 and 4. Migration
  `20260930163000_one_set_per_word` is written but not applied; typecheck, lint
  and knip pass, the API and UI were not exercised against the new schema.

<!-- slug: fsrs-vocabulary-review -->
