# Spaced Repetition Flow

## Card Review (SM-2)

```text
Generated Question
  -> QuestionReview created or fetched for user
  -> learner reviews due question
  -> POST /api/cards/review with qualityRating 0..5
  -> quiz-review.ts:calculateSM2Interval() -> scheduler.ts:sm2()
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

### Why Shared logic, Separate paths

- Card review operates on `QuestionReview` records tied to passage questions. It uses SM-2 with quality ratings 0-5.
- Vocabulary review operates on `VocabularyItem` records with a simpler 3-state model (NEW/LEARNING/MASTERED).
- Both utilize `src/server/modules/spaced-repetition/scheduler.ts` to ensure all "time-until-next" math is centralized, even if the algorithms differ.

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
| `POST /api/study-session` | Ensure an active study session window. |
| `GET /api/progress/stats` | Return aggregate user progress. |

## Code Paths

### Spaced Repetition (SRS)
- Logic: `src/server/modules/spaced-repetition/scheduler.ts` (SM-2 + Simple)
- Question reviews: `src/server/db/quiz/quiz-review.ts`
- Vocabulary reviews: `src/server/db/vocabulary-queries.ts`
- Progress UI: `src/features/progress/progress-dashboard.tsx`
