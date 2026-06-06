# Spaced Repetition Flow

## Flow

```text
Generated Question
  -> CardReview created or fetched for user
  -> learner reviews due card
  -> POST /api/cards/review with qualityRating 0..5
  -> calculateSM2Interval()
  -> update easeFactor, intervalDays, repetitions, nextReviewDate
  -> progress stats reflect due/mature/today/streak counts
```

## Routes

| Route | Purpose |
|-------|---------|
| `GET /api/cards/due` | Return up to 20 due cards for authenticated user. |
| `POST /api/cards/review` | Update review state for one card review. |
| `POST /api/study-session` | Create optional passage-scoped study session. |
| `PATCH /api/study-session` | Complete session counters and accuracy. |
| `GET /api/progress/stats` | Return aggregate user progress. |

## Code Paths

- Algorithm: `src/lib/algorithms/sm2.ts`
- Review queries: `src/lib/db/card-review-queries.ts`
- Session queries: `src/lib/db/study-session-queries.ts`
- Progress UI: `src/features/progress/progress-dashboard.tsx`

