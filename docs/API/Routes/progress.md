# Progress API

## Purpose

Expose aggregate study progress statistics for the authenticated user. This is a
read-only reporting domain computed from study-session activity.

> Creating/ensuring a study session is part of the **Study** domain
> ([study/sessions.md](study/sessions.md)), not this domain.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/progress/stats` | Return aggregate progress stats for the authenticated user. |

## Auth And Ownership

Authenticated user-owned read. Requires authentication; all reads use the
authenticated `userId`. Unauthenticated requests return
`{ "error": "Authentication required." }` with `401`.

## Progress Stats

`GET /api/progress/stats` — no request input.

### Success response

```ts
{
  success: true;
  data: ProgressStats;
}
```

`ProgressStats`:

```ts
{
  streakDays: number;
  timeStudiedTodaySeconds: number;
  timeStudiedWeekSeconds: number;
  activeDaysThisWeek: number;
}
```

| Metric | Definition |
|--------|------------|
| `streakDays` | Consecutive days where study time exceeded the daily threshold |
| `timeStudiedTodaySeconds` | Total study seconds today (ungated) |
| `timeStudiedWeekSeconds` | Total study seconds this week (ungated) |
| `activeDaysThisWeek` | Days this week that met the streak time threshold |

A day counts toward `streakDays` / `activeDaysThisWeek` only when total study
time that day exceeds the threshold; raw `timeStudied*` totals stay ungated.

### Error cases

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `401` | Missing auth |
| `500` | Unexpected progress stats failure |

### Boundaries

- Stats are derived from the user's study-session records.
- No client or server cache is expected.

## Implementation References

- Route: `src/app/api/progress/stats/route.ts`
- Stats query: `src/server/db/quiz/quiz-review.ts` (`getUserProgress`)
- Client: `src/features/progress/api-client/progress-client.ts`
