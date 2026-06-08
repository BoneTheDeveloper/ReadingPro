# Spaced Repetition Flow

## Card Review (SM-2)

```text
Generated Question
  -> CardReview created or fetched for user
  -> learner reviews due card
  -> POST /api/cards/review with qualityRating 0..5
  -> calculateSM2Interval()
  -> update easeFactor, intervalDays, repetitions, nextReviewDate
  -> progress stats reflect due/mature/today/streak counts
```

## Vocabulary Review (Simplified Fixed Intervals)

Vocabulary review uses a separate, simpler system from the SM-2 card review. The two are independent.

```text
Vocabulary item saved
  -> status = NEW, nextReviewAt = now + 1 day
  -> learner reviews item (deferred: GET /api/vocabulary/due, POST /api/vocabulary/[id]/review)
  -> NEW item reviewed -> status = LEARNING
  -> LEARNING correct -> nextReviewAt = now + 3 days
  -> LEARNING incorrect -> nextReviewAt = now + 1 day
  -> LEARNING 2 consecutive correct -> status = MASTERED, nextReviewAt = null
  -> MASTERED -> no scheduled review
  -> MASTERED incorrect -> status = LEARNING
  -> Manual override allowed from vocabulary page via PATCH /api/vocabulary/[id]/status
```

Status transitions:

```text
NEW --(first review)--> LEARNING
LEARNING --(2 consecutive correct)--> MASTERED
LEARNING --(incorrect)--> LEARNING (reset interval to +1d)
MASTERED --(incorrect)--> LEARNING
```

Review scheduling:

| Current Status | Review Result | nextReviewAt |
|---------------|---------------|-------------|
| NEW | any | now + 1 day |
| LEARNING | correct | now + 3 days |
| LEARNING | incorrect | now + 1 day |
| MASTERED | (no scheduled review) | null |

This is a fixed-interval MVP. Full SM-2 integration for vocabulary is deferred.

### Why Separate from Card Review

- Card review operates on auto-generated `CardReview` records tied to passage questions. It uses SM-2 with quality ratings 0-5 and tracks ease factor, interval days, and repetitions.
- Vocabulary review operates on `VocabularyItem` records with a simpler 3-state model (NEW/LEARNING/MASTERED) and fixed intervals. No quality rating -- correct/incorrect only.
- The two systems share no database tables or scheduling logic. They converge only in aggregate progress stats.

## Routes

### Card Review

| Route | Purpose |
|-------|---------|
| `GET /api/cards/due` | Return up to 20 due cards for authenticated user. |
| `POST /api/cards/review` | Update review state for one card review. |

### Vocabulary Review (deferred to Phase 5)

| Route | Purpose |
|-------|---------|
| `GET /api/vocabulary/due` | Items due for review (status NEW or LEARNING, nextReviewAt <= now). |
| `POST /api/vocabulary/[id]/review` | Submit review result, update status and nextReviewAt. |

### Status Override

| Route | Purpose |
|-------|---------|
| `PATCH /api/vocabulary/[id]/status` | Manually override item status (NEW/LEARNING/MASTERED). |

### Session & Progress

| Route | Purpose |
|-------|---------|
| `POST /api/study-session` | Create optional passage-scoped study session. |
| `PATCH /api/study-session` | Complete session counters and accuracy. |
| `GET /api/progress/stats` | Return aggregate user progress. |

## Code Paths

### Card Review
- Algorithm: `src/lib/algorithms/sm2.ts`
- Review queries: `src/lib/db/card-review-queries.ts`
- Session queries: `src/lib/db/study-session-queries.ts`
- Progress UI: `src/features/progress/progress-dashboard.tsx`

### Vocabulary
- Item queries: `src/lib/db/vocabulary-queries.ts`
- Set queries: `src/lib/db/vocabulary-set-queries.ts`
- Save flow: `docs/Flows/vocabulary-flow.md`
- Data model ADR: `docs/ADR/0005-vocabulary-review-mvp-path.md`
