# Cards API

## Purpose

Expose due cards and update card review state with the SM-2 algorithm.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/cards/due` | Return due card reviews for the authenticated user. |
| `POST` | `/api/cards/review` | Submit a quality rating and update review scheduling. |

## Auth And Ownership

Requires authentication. Due-card reads filter by `userId`. Review updates load the review by `id` and `userId`.
Unauthenticated requests return `{ "error": "Authentication required." }` with
`401`. Review ownership misses return `{ "error": "Card review not found." }`
with `404`.

## Review Request

```json
{
  "questionReviewId": "uuid",
  "qualityRating": 5
}
```

`qualityRating` must be an integer from `0` to `5`.

## Side Effects

`POST /api/cards/review` updates:

- `qualityRating`
- `easeFactor`
- `intervalDays`
- `repetitions`
- `nextReviewDate`
- `reviewedAt`

## Implementation

- Routes: `src/app/api/cards/due/route.ts`, `src/app/api/cards/review/route.ts`
- Queries: `src/lib/db/quiz/quiz-review.ts`
- Algorithm: `src/lib/spaced-repetition/scheduler.ts`
