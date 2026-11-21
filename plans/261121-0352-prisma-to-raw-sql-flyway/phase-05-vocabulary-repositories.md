---
phase: 5
title: "Phase 5: Vocabulary items, sets and review repositories"
status: todo
priority: P1
effort: "6h"
dependencies: [3, 4]
---

# Phase 5: Vocabulary items, sets and review repositories

## Overview

Today the vocabulary services query Prisma directly. Split each sub-module into
a repository, which holds the SQL, and a service, which keeps the rules, the
`AppError`s and the transactions. Preserve the concurrency guarantees:
- a profile row lock so a user gets only one default set
- a card row lock so two ratings of one card do not read the same state
- `clientReviewId` idempotency, so a resent rating is applied once

## Context Links

- `src/server/modules/vocabulary/items/vocabulary-item-service.ts` (7 Prisma calls)
- `src/server/modules/vocabulary/sets/vocabulary-set-service.ts` (14 Prisma calls, two transactions)
- `src/server/modules/vocabulary/review/review-service.ts` (12 Prisma calls, one transaction with `FOR UPDATE`)
- `src/server/modules/vocabulary/default-vocabulary-set.ts` (transaction with a profile lock and an upsert)
- `src/server/modules/vocabulary/fsrs-scheduler.ts` (`ScheduleState`, `schedule()`: the columns written on a rating)
- `src/shared/vocabulary/schema.ts`, `set-schema.ts`, `review-schema.ts` (the result shapes)

## Requirements

- [ ] Three new repositories:
  - `items/vocabulary-item-repository.ts`: upsert item, list, find id, delete, update, status counts
  - `sets/vocabulary-set-repository.ts`: find the default set id, upsert the default set, find, list, create, update, delete, move items to a set, move all items between sets, count owned items, list items in sets, list unfiled due and new item ids
  - `review/review-repository.ts`: find a card with its passage, lock and read a card, list due cards, count new cards introduced today by set, list new cards in a set, create, find, end and increment a session, find a log by `clientReviewId`, insert a log, update a card's schedule
- [ ] The service functions keep their names, signatures and results, so the routes and `index.ts` are unchanged.
- [ ] `ensureDefaultSetForUser` keeps a fast path outside the transaction. Inside the transaction it calls `lockProfile(userId, tx)` from the profile module, re-checks, then runs `INSERT ... ON CONFLICT ("userId", "name") DO UPDATE SET "isDefault" = true RETURNING "id"`.
- [ ] A repeat save of a word runs `ON CONFLICT ("userId", "term", "translation") DO UPDATE SET "partofSpeech" = EXCLUDED."partofSpeech", "savedCount" = "VocabularyItem"."savedCount" + 1, "updatedAt" = now()`. It keeps the first context and the set the user filed the word in.
- [ ] A rating is all or nothing in one `withTransaction`:
  - check the session
  - `SELECT <card columns> ... FOR UPDATE`, which replaces the separate lock query and read
  - insert the log, update the card with `"updatedAt" = now()`, and increment `"cardsReviewed"`
- [ ] When two copies of a rating race, the unique violation is still swallowed, as today.
- [ ] Optional updates use `COALESCE($n, "col")`, matching Prisma's `undefined` meaning "unchanged". This covers set `name` and `dailyNewLimit`, and item `term`, `translation` and `partofSpeech`.
- [ ] Id lists use `"id" = ANY($n::uuid[])`. An empty list skips the query.
- [ ] Review cards return `passage` as `{ id, title }` or `null`, built in SQL with `CASE WHEN p."id" IS NULL THEN NULL ELSE json_build_object('id', p."id", 'title', p."title") END`.
- [ ] Settings come from `findProfileSettings` in the profile module, not from vocabulary SQL.

## Files

- Create: `src/server/modules/vocabulary/items/vocabulary-item-repository.ts`
- Create: `src/server/modules/vocabulary/sets/vocabulary-set-repository.ts`
- Create: `src/server/modules/vocabulary/review/review-repository.ts`
- Modify: `src/server/modules/vocabulary/items/vocabulary-item-service.ts`
- Modify: `src/server/modules/vocabulary/sets/vocabulary-set-service.ts`
- Modify: `src/server/modules/vocabulary/review/review-service.ts`
- Modify: `src/server/modules/vocabulary/default-vocabulary-set.ts`
- Create: `src/server/modules/vocabulary/items/vocabulary-item-service.test.ts`
- Create: `src/server/modules/vocabulary/sets/vocabulary-set-service.test.ts`
- Create: `src/server/modules/vocabulary/review/review-service.test.ts`

## Implementation Steps

1. Read `fsrs-scheduler.ts` and list the exact fields of `next` that `schedule()` returns. The card UPDATE writes exactly those columns.
2. Write the three repositories. Each function takes `db: Queryable = pool` last, so services can pass `tx`.
3. Rewrite the services so they call only repositories and the profile module.
   - Keep `withItems`, `requireSetForUser` and `requireItemsForUser` in the service as they are. Only their data calls change.
   - `deleteVocabularySetForUser` runs the item move and the set delete in one `withTransaction`.
4. Write the service tests on the dev DB, with their own test users cleaned up after each test (phase 2):
   - **Items:**
     - Saving the same term and translation twice gives `savedCount = 2` and keeps the original `vocabularySetId`.
     - Updating to an existing term and translation throws `vocabulary.duplicate`.
     - Deleting another user's item throws `vocabulary.not_found`.
     - Stats count by status and total.
   - **Sets:**
     - Five parallel `ensureDefaultSetForUser` calls create one default set.
     - Create moves the given words.
     - A duplicate name throws `vocabulary_set.name_taken`.
     - Deleting the default set throws `vocabulary_set.default_protected`.
     - Deleting another set returns its words to the default set.
     - Generate needs the Pro tier, and picks due words first, then new words, up to `size`.
   - **Review:**
     - Due cards come first, oldest due first, then new cards.
     - New cards stop at a set's `dailyNewLimit` minus today's first ratings.
     - A rating writes one log, updates the card and increments `cardsReviewed`.
     - Resending the same `clientReviewId` changes nothing.
     - Another user's `clientReviewId` throws `vocabulary.not_found`.
     - Rating in an ended session throws `review.session_ended`.
     - Ending a session twice returns the first `endedAt`.
5. If importing a service pulls `workflow/api` (through `@/server/modules/passage`) and fails under Vitest, add `vi.mock("workflow/api", () => ({ start: vi.fn() }))` to the affected test files.

## Todo

- [ ] Item repository and service
- [ ] Set repository and service, plus the default set
- [ ] Review repository and service
- [ ] Service tests

## Success Criteria

- `pnpm test src/server/modules/vocabulary` passes.
- `grep -rn "prisma" src/server/modules` finds nothing.
- No `*-service.ts` file contains `SELECT`, `INSERT`, `UPDATE` or `DELETE`. Check with `grep -rlE '\b(SELECT|INSERT|UPDATE|DELETE)\b' src/server/modules --include='*-service.ts'`.
- Manual check: save a word while reading, file it into a set, review it, and rate it. The review screen shows the next card.
