---
phase: 4
title: "Tests"
status: pending
priority: P1
effort: "2h"
dependencies: [1, 2, 3]
---

# Phase 4: Tests

## Overview

Cover the quiz attempt create/complete, study session creation on first answer, progress stats with quiz data, and retry semantics with unit and integration tests.

## Requirements

- Functional: Tests cover quiz attempt CRUD, progress stats with quiz data, retry semantics
- Non-functional: Tests run against real database (no mocks per project rules)

## Related Code Files

- Create: `src/lib/db/__tests__/quiz-attempt-queries.test.ts`
- Create: `src/features/study/__tests__/study-quiz-attempt-flow.test.tsx`
- Modify: existing progress test files to include quiz attempt data

## Implementation Steps

1. **Quiz attempt queries test** (`quiz-attempt-queries.test.ts`):
   - `createQuizAttempt` — creates attempt linked to session
   - `createQuizAttempt` — throws on invalid sessionId
   - `completeQuizAttempt` — completes with counts, verifies accuracy computed
   - `completeQuizAttempt` — throws on attempt not owned by user
   - `completeQuizAttempt` — throws on already-completed attempt

2. **Progress stats with quiz attempts** (extend existing or new file):
   - `getUserProgress` — returns `totalQuizAttempts: 0`, `avgQuizAccuracy: null` when no attempts
   - `getUserProgress` — returns attempt counts after completed attempts exist
   - `getUserProgress` — only counts completed attempts (not in-progress)

3. **Quiz integration test** (`study-quiz-attempt-flow.test.tsx`):
   - Rendering QuizContent → selecting answer → checking answer creates session + attempt
   - Completing all questions → QuizResults renders → PATCH called with correct counts
   - Clicking "Try Again" → resets state → new session + attempt on next answer

## Success Criteria

- [ ] Quiz attempt create/complete query tests pass
- [ ] Progress stats include quiz attempt data
- [ ] Only completed attempts counted in stats
- [ ] Quiz retry creates new session + attempt
- [ ] Accuracy computed server-side: `correctCount / totalQuestions * 100`
- [ ] All existing tests still pass

## Risk Assessment

- **Risk:** Integration tests need database state. **Mitigation:** Follow existing test patterns — use test database with cleanup.
