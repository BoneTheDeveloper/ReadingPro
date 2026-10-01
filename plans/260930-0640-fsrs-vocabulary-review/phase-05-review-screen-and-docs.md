---
phase: 5
title: "Phase 5: Review screen and docs"
status: in-progress
priority: P1
effort: "6h"
dependencies: [3, 4]
---

# Phase 5: Review screen and docs

## Overview

Build the review screen for US-14 and US-15, add its entry points on the
vocabulary page, and update the README to describe the new module surface.

## Context Links

- [EP-05](../../docs/Requirements/epic-05-memorization-review.md), US-14 and US-15
- Design page, section "Luồng một phiên ôn tập"
- `src/client/routes.ts`, `src/client/routes/vocabulary.tsx` (loader pattern)
- `src/client/features/vocabulary/` (feature folder and `index.ts` entry point)
- `README.md`, "What it does" and "Directory map"

## Screen behavior

1. `/review` (optional `?setId=`) loads `GET /api/review/due`.
2. Nothing due: show "Bạn đã ôn xong" and a disabled start button. No session is created.
3. Cards due: show the due and new counts and an enabled start button. Pressing it
   calls `POST /api/review/sessions`, then shows the first card.
4. Front of the card: term and part of speech. "Hiện đáp án" flips it.
5. Back of the card: translation, `contextSentence` when present, and a link to the
   passage when `passage` is not null.
6. Four buttons, Again / Hard / Good / Easy, each labelled with the interval
   derived from `nextDue` (for example "10 phút", "3 ngày"). They appear only
   after the flip.
7. A rating posts `{ vocabularyItemId, rating, clientReviewId, durationMs }` with a
   fresh `crypto.randomUUID()` per rating; a retry of a failed request reuses the
   same id. `durationMs` is the time from showing the card to the rating.
8. If the returned card has `scheduledDays === 0`, push it to the back of the
   queue with its new `nextDue`; otherwise drop it. Show the next card.
9. Queue empty: call `PATCH /api/review/sessions/:id`, show the finished state with
   `cardsReviewed`, and invalidate the vocabulary, set, and review queries.

## Requirements

- [x] The start button is disabled when nothing is due.
- [x] The four rating buttons show predicted intervals from the server.
- [x] A card rated into a short learning step returns in the same session.
- [x] A failed rating request keeps the card on screen and can be retried without double counting.
- [x] The back of the card shows the first-seen sentence and a passage link.
- [x] The vocabulary page offers "Ôn tập" for all due cards and per set.

## Related Code Files

- Create: `src/client/routes/review.tsx`
- Modify: `src/client/routes.ts` (add `route("review", "routes/review.tsx")` inside the dashboard layout)
- Create: `src/client/features/vocabulary/api/review-queries.ts`, `api/review-mutations.ts`
- Create: `src/client/features/vocabulary/components/review-page.tsx`, `review-card.tsx`
- Create: `src/client/features/vocabulary/lib/format-interval.ts`
- Modify: `src/client/features/vocabulary/index.ts` (export the page and queries)
- Modify: `src/client/features/vocabulary/components/vocabulary-page.tsx`, `vocabulary-set-list.tsx` (entry points)
- Modify: `src/client/components/layout/dashboard-sidebar.tsx` (treat `/review` as part of the vocabulary section in `isActive`)
- Modify: `README.md`

## Implementation Steps

1. **API layer:** `reviewQueries.due(setId?)` with `staleTime: 0`; mutations for
   start session, rate, and end session, all through `fetchJson` with the phase 4
   schemas. The rate mutation sets `retry: 2` and takes the `clientReviewId` from
   its variables so retries reuse it.
2. **`format-interval.ts`:** `formatInterval(from, to)` returning minutes under one
   hour, hours under one day, days under 30, then months, in Vietnamese.
3. **`review-card.tsx`:** presentational; props are the card, the flipped flag, and
   handlers. Use existing `Card`, `Button`, and `Badge` from `components/ui`. The
   passage link targets the study route the same way the library panel opens a
   passage; read `src/client/routes/study/` for the current parameter before
   writing the link.
4. **`review-page.tsx`:** holds the queue in `useState`, seeded from the due query
   when the session starts. Implements steps 2 to 9 of "Screen behavior". On
   unmount with an open session, send the end-session request once.
5. **Route** (`routes/review.tsx`): `clientLoader` preloads `reviewQueries.due(setId)`
   like `routes/vocabulary.tsx`; the component renders the page with `setId` from
   the search params.
6. **Entry points:** on the vocabulary page header, an "Ôn tập" link to `/review`
   with the due count from `reviewQueries.due()`; on each set card, a link to
   `/review?setId=<id>`.
7. **README:** in "What it does", keep the Memorization row and mention FSRS
   scheduling. In "Directory map", change the client `vocabulary/` line to
   "word bank, sets, review" and the server `vocabulary/` line to
   "word bank CRUD, sets, FSRS review"; add `review` to the `routes/` comment.
8. Run the verification commands and the manual pass below.

## Todo

- [x] Review queries and mutations
- [x] Interval formatter
- [x] Review card component
- [x] Review page with queue, retry, and finish state
- [x] Route and sidebar active state
- [x] Entry points on the vocabulary page and set cards
- [x] README updated
- [ ] Verification passed (automated gates pass; browser pass not run)

## Success Criteria

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- Manual, with `pnpm dev`:
  - No words due: `/review` shows the caught-up state and the start button is disabled.
  - Save three words from a passage, open `/review`, start: three cards appear in turn.
  - The back shows the saved sentence and the passage link opens that passage.
  - Each button shows a different interval, shortest on Again.
  - Rate a card Again: it comes back later in the same session.
  - Rate the rest Good or Easy until the queue empties: the finished state shows
    the number of ratings, and `/vocabulary` shows the new statuses.
  - Throttle the network to offline, press a rating, go back online: the rating is
    applied once (one `ReviewLog` row for that card and time).
  - From a set card, "Ôn tập" reviews only that set's words.
- README directory map matches the tree.

## Risk Assessment

- **Queue drift from server state.** The queue is rebuilt from `GET /due` on each
  visit, so a stale queue lasts one session at most.
- **End-session request on unmount** may be cancelled by navigation. The session
  then stays open with a correct `cardsReviewed`; this affects no schedule.
- **Rollback:** revert the commit; phases 1 to 4 keep working without the screen.

## Security Considerations

The client never computes or sends schedule values. Card content is rendered as
text; do not use `dangerouslySetInnerHTML` for the context sentence.

## Next Steps

After this phase, compare the result with the plan's Success Criteria, then
update the design page's task list. Parameter optimization from `ReviewLog` and a
settings screen are the natural follow-ups, both outside this plan.
