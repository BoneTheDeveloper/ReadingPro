---
phase: 3
title: "Progress Dashboard Update"
status: completed
priority: P2
effort: "1h"
dependencies: [2]
---

# Phase 3: Progress Dashboard Update

## Overview

Add completed quiz attempt stats to the progress dashboard: total quiz attempts, average quiz accuracy, and attempts completed today. QuizAttempt is the source of truth — stats query the `quiz_attempts` table directly.

## Requirements

- Functional: Progress page shows completed quiz attempt count and average accuracy
- Functional: Today's completed attempts visible alongside card review stats
- Non-functional: Stats query efficient (indexed fields: `[userId, startedAt]`)
- Non-functional: Only completed attempts counted (`completedAt IS NOT NULL`)

## Architecture

```
GET /api/progress/stats
  ├── existing: card review stats (totalCards, matureCards, dueCards, todayReviews, streakDays)
  └── new: quiz attempt stats (totalQuizAttempts, avgQuizAccuracy, todayQuizAttempts)
```

## Related Code Files

- Modify: `src/app/api/progress/stats/route.ts` — add quiz attempt aggregation
- Modify: `src/lib/db/card-review-queries.ts` — add quiz attempt stats to `getUserProgress()` or separate query
- Modify: `src/lib/study/shared/study-response-schema.ts` — extend `progressStatsSchema`
- Modify: `src/features/progress/progress-dashboard.tsx` — display new stats

## Implementation Steps

1. Extend `progressStatsSchema` with quiz attempt fields:
   ```ts
   totalQuizAttempts: z.number(),
   avgQuizAccuracy: z.number().nullable(),
   todayQuizAttempts: z.number(),
   ```

2. Add quiz attempt stats query (in `card-review-queries.ts` or new `quiz-attempt-queries.ts`):
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE "completedAt" IS NOT NULL)::bigint AS "totalQuizAttempts",
     AVG("accuracyRate") FILTER (WHERE "completedAt" IS NOT NULL AND "accuracyRate" IS NOT NULL) AS "avgQuizAccuracy",
     COUNT(*) FILTER (WHERE "completedAt" >= $1)::bigint AS "todayQuizAttempts"
   FROM quiz_attempts
   WHERE "userId" = $2
   ```

3. Merge quiz stats into `getUserProgress()` return value

4. Add new stat cards to `progress-dashboard.tsx`:
   - "Quizzes Completed" — `totalQuizAttempts`
   - "Avg. Accuracy" — `avgQuizAccuracy` (display as `{value}%` or `"—"`)
   - "Today's Quizzes" — `todayQuizAttempts`

5. Adjust grid to accommodate new stat cards

## Success Criteria

- [x] Progress API returns `totalQuizAttempts`, `avgQuizAccuracy`, `todayQuizAttempts`
- [x] Schema validates new fields
- [x] Dashboard displays completed quiz count and average accuracy
- [x] Only completed attempts counted (`completedAt IS NOT NULL`)
- [x] Abandoned quizzes not counted

## Risk Assessment

- **Risk:** AVG on large dataset. **Mitigation:** `@@index([userId, startedAt])` exists. Volume expected to be low for MVP. Can optimize later if needed.
