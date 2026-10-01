---
phase: 4
title: "Phase 4: FSRS scheduler and review API"
status: completed
priority: P1
effort: "6h"
dependencies: [1]
---

# Phase 4: FSRS scheduler and review API

## Overview

Add `ts-fsrs`, a small scheduler module that converts between database rows and
the library's `Card`, and the review endpoints for US-14 and US-15.

## Context Links

- [EP-05](../../docs/Requirements/epic-05-memorization-review.md), US-14 and US-15
- Design page, sections "Yêu cầu phi chức năng" and "Luồng một phiên ôn tập"
- ts-fsrs: https://github.com/open-spaced-repetition/ts-fsrs (5.4.2 on npm, Node >= 20)
- ABC of FSRS: https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS

## Key Insights

- `fsrs(params).next(card, now, grade)` returns `{ card, log }`: the card after the
  rating and a log holding the state **before** it (`state`, `due`, `stability`,
  `difficulty`, `learning_steps`) plus `scheduled_days` after it.
- `fsrs(params).repeat(card, now)` returns all four outcomes without changing
  anything; it supplies the interval shown on each button.
- `State` is `New, Learning, Review, Relearning` and `Rating` grades are
  `Again = 1` to `Easy = 4`, matching the two Prisma enums in order.
- `elapsed_days` is deprecated in the library; compute `elapsedDays` from
  `lastReviewAt`.
- Library defaults are used for weights, learning steps, fuzz, and short-term
  scheduling. Only `request_retention` comes from the user.

## API

Mounted at `/api/review`, behind `requireSession`.

| Method and path | Body or query | Result |
|---|---|---|
| `GET /due` | `?setId=` optional | `{ cards: ReviewCard[], dueCount, newCount }` |
| `POST /sessions` | `{ setId? }` | 201 `ReviewSession` |
| `POST /sessions/:id/ratings` | `{ vocabularyItemId, rating, clientReviewId, durationMs? }` | `{ card: ReviewCard }` |
| `PATCH /sessions/:id` | | `ReviewSession` with `endedAt` set |

`ReviewCard` = `{ id, term, translation, partofSpeech, status, dueAt, scheduledDays, contextSentence, passage: { id, title } | null, nextDue: { AGAIN, HARD, GOOD, EASY } }`
where each `nextDue` value is the date the card would be due after that rating.

`ReviewSession` = `{ id, vocabularySetId, startedAt, endedAt, cardsReviewed }`.

## Requirements

- [x] Due cards are non-NEW words with `dueAt <= now`, ordered by `dueAt`, read through the `(userId, dueAt)` index.
- [x] NEW cards are appended in `createdAt` order, limited to `dailyNewLimit` minus the NEW cards already first-rated since the start of the user's local day.
- [x] `setId` restricts both groups to members of that set; the set must be the caller's.
- [x] A rating reads the card, computes the schedule, writes the log, updates the card, and increments `cardsReviewed` in one transaction.
- [x] A repeated `clientReviewId` returns the card's current state and writes nothing.
- [x] A session that is not the caller's, or has ended, is refused.
- [x] Status and schedule fields are written only here.

## Related Code Files

- Modify: `package.json`, `pnpm-lock.yaml` (`pnpm add ts-fsrs`)
- Create: `src/shared/vocabulary/review-schema.ts`
- Create: `src/server/modules/vocabulary/fsrs-scheduler.ts`
- Create: `src/server/modules/vocabulary/review-service.ts`, `review-routes.ts`
- Modify: `src/server/app.ts`, `src/shared/api-error.ts`, `src/client/lib/api/error-message.ts`

## Implementation Steps

1. `pnpm add ts-fsrs`. Open the installed type declarations and confirm the names
   used below (`fsrs`, `generatorParameters`, `Rating`, `State`, `Card`, `Grade`,
   `next`, `repeat`, and the `Card` field list). Adjust the mapping to what is
   installed before writing anything else.
2. **Contracts** (`review-schema.ts`): `ReviewCardSchema`, `ReviewDueResponseSchema`,
   `ReviewSessionSchema`, `ReviewSessionCreateInputSchema`,
   `ReviewRatingInputSchema` (`rating: z.nativeEnum(ReviewRating)`,
   `clientReviewId: z.string().uuid()`, `durationMs` int 0..600000 optional),
   `ReviewDueQuerySchema`, session id param schema.
3. **Scheduler** (`fsrs-scheduler.ts`), pure functions with no database access:
   - `createScheduler({ desiredRetention, fsrsParams })` returns
     `fsrs(generatorParameters({ request_retention, ...(w && { w }) }))`, where `w`
     is used only when `fsrsParams` is an array of numbers.
   - `toCard(row)`: `dueAt → due`, `stability`, `difficulty`,
     `scheduledDays → scheduled_days`, `learningSteps → learning_steps`, `reps`,
     `lapses`, `status → state`, `lastReviewAt → last_review`, `elapsed_days: 0`.
   - `toRowUpdate(card)`: the reverse, producing the Prisma `data` object.
   - Two lookup tables: `VocabularyStatus ↔ State`, `ReviewRating ↔ Rating`.
   - `previewNextDue(scheduler, row, now)`: call `repeat` and return the four due dates.
   - `schedule(scheduler, row, rating, now)`: call `next` and return
     `{ update, log }` where `log` holds the before-state fields for `ReviewLog`
     and `elapsedDays = lastReviewAt ? floor((now − lastReviewAt) / 86 400 000) : 0`.
   - `startOfDayInTimeZone(now, timeZone)`: the UTC instant of local midnight,
     computed with `Intl.DateTimeFormat` parts. No date library.
4. **Error reasons:** `review.session_not_found` (404), `review.session_ended` (409).
   A word that is not the caller's reuses `vocabulary.not_found`; a set reuses
   `vocabulary_set.not_found` (add it here if phase 3 has not landed).
5. **Service** (`review-service.ts`):
   - `listDueCardsForUser(userId, setId?)`: load the profile settings; if `setId`,
     verify ownership; count today's introduced cards with
     `reviewLog.count({ userId, status: "NEW", reviewedAt: { gte: startOfDay } })`;
     run the two queries from Requirements with `include: { passage: { select: { id, title } } }`;
     map each row to `ReviewCard` with `previewNextDue`.
   - `startReviewSessionForUser(userId, setId?)`: ownership check, create.
   - `rateCardForUser(userId, sessionId, input)`:
     1. Look up `ReviewLog` by `clientReviewId`. If it exists for this user,
        return the card's current `ReviewCard` and stop.
     2. `prisma.$transaction(async (tx) => { ... })`: load the session
        (`id`, `userId`, `endedAt`); lock the card with
        ``tx.$queryRaw`SELECT id FROM "VocabularyItem" WHERE id = ${id}::uuid AND "userId" = ${userId} FOR UPDATE` ``;
        read the card; call `schedule`; `tx.reviewLog.create` with `rating`, the
        before-state, `elapsedDays`, `scheduledDays`, `durationMs`, `sessionId`,
        `clientReviewId`, `reviewedAt: now`; `tx.vocabularyItem.update` with the
        new state; `tx.reviewSession.update({ cardsReviewed: { increment: 1 } })`.
     3. Catch `P2002` on `clientReviewId` (two copies of one request racing) and
        return the current card as in step 1.
     4. Return the updated card with a fresh `nextDue`.
   - `endReviewSessionForUser(userId, sessionId)`: set `endedAt` if it is null;
     calling it twice returns the same session.
6. **Routes** (`review-routes.ts`) following `vocabulary-routes.ts`; mount with
   `.route("/review", reviewRoutes)` in `src/server/app.ts`.
7. Run the verification commands and the `curl` script below.

## Todo

- [x] `ts-fsrs` installed and API names confirmed against installed types
- [x] Shared review contracts
- [x] Scheduler module
- [x] Error reasons and messages
- [x] Review service with transaction and idempotency
- [x] Routes mounted
- [x] Verification passed

## Success Criteria

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- With three NEW words and `dailyNewLimit` 10, `GET /api/review/due` returns three
  cards, each with `nextDue.AGAIN < nextDue.HARD <= nextDue.GOOD < nextDue.EASY`.
- Rate one card GOOD: the row has `status` LEARNING or REVIEW, `reps` 1,
  `stability > 0`, `lastReviewAt` set, `dueAt` in the future; one `ReviewLog` row
  exists with `status` NEW and `rating` GOOD; the session shows `cardsReviewed` 1.
- Send the same request again with the same `clientReviewId`: still one log row,
  `reps` still 1, `cardsReviewed` still 1, response 200.
- Force a card due (`UPDATE "VocabularyItem" SET "dueAt" = now() - interval '1 day' WHERE id = ...`
  on a REVIEW card) and rate it AGAIN: `status` RELEARNING, `lapses` 1.
- Set `dailyNewLimit` to 2 with SQL: `GET /due` returns two NEW cards; after
  rating both, it returns no NEW cards until the next local day.
- `GET /due?setId=<other user's set>` answers 404.
- Rating on an ended session answers 409; on another user's session, 404.
- `GET /api/review/due` with nothing due returns `{ cards: [], dueCount: 0, newCount: 0 }`.

## Risk Assessment

- **Library API differs from the documentation.** Step 1 checks the installed
  types first; the mapping module is the only file that touches the library.
- **Float rounding.** Store `stability` and `difficulty` as returned; do not round.
- **Time zone helper.** A wrong offset shifts the daily limit by hours. Check the
  helper with `Asia/Bangkok` at 23:30 and 00:30 local time in a one-off
  `node -e` call before wiring it in.
- **Rollback:** revert the commit and `pnpm install`; the tables stay but are unused.

## Security Considerations

`userId` comes only from the session. The rating body carries no schedule fields;
the server computes all of them. `durationMs` is bounded. `fsrsParams` is read
from the database only and validated as a number array before use.

## Next Steps

Phase 5 builds the review screen on these endpoints.
