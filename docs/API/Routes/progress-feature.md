# Progress And Study Session API

## Purpose

Track study session counters and expose aggregate progress stats.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/progress/stats` | Return aggregate review stats for the authenticated user. |
| `POST` | `/api/study-session` | Create a study session, optionally scoped to a passage. |
| `PATCH` | `/api/study-session` | Complete/update study session counters. |

## Auth And Ownership

Requires authentication. All reads and writes use authenticated `userId`.

## Study Session Create

```json
{
  "passageId": "optional uuid"
}
```

## Study Session Patch

```json
{
  "sessionId": "uuid",
  "cardsReviewed": 10,
  "correctCount": 8,
  "incorrectCount": 2
}
```

## Progress Response

`GET /api/progress/stats` returns totals for:

- `totalCards`
- `matureCards`
- `dueCards`
- `todayReviews`
- `streakDays`

## Implementation

- Progress route: `src/app/api/progress/stats/route.ts`
- Session route: `src/app/api/study-session/route.ts`
- Card stats: `src/lib/db/card-review-queries.ts`
- Session queries: `src/lib/db/study-session-queries.ts`
