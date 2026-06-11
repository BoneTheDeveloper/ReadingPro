---
title: "Persist Quiz Completion into Study Sessions and Progress"
description: "Add QuizAttempt model as source of truth for quiz performance, wire quiz flow to persist attempts on first answer submit and complete on finish, update progress dashboard"
status: completed
priority: P1
branch: "feat/64-persist-quiz-completion"
tags: [core-study-loop, study-session, quiz-attempt, progress]
blockedBy: []
blocks: []
created: "2026-06-08T14:30:25.399Z"
createdBy: "ck:plan"
source: skill
---

# Persist Quiz Completion into Study Sessions and Progress

## Overview

Add a `QuizAttempt` model as the **source of truth for quiz performance**. `StudySession` tracks study engagement ("how did the user study?"); `QuizAttempt` tracks quiz performance ("how well did the user perform?"). Create both on first answer submit, complete QuizAttempt on finish. Update progress dashboard to show quiz stats.

**GitHub Issue:** #64
**Depends On:** #46 (CLOSED — API validation fixes merged)

## Key Findings (from codebase analysis)

- **API exists**: `POST/PATCH /api/study-session` creates/updates sessions
- **DB queries exist**: `createStudySession()` and `updateStudySession()` in `src/lib/db/study-session-queries.ts`
- **Schema ready**: `StudySession` model has all required fields
- **Gap**: No `QuizAttempt` model — quiz progress needs separate tracking
- **Gap**: `computeSessionAccuracy()` queries `card_reviews`, not quiz answers → accuracy is `null` for quiz-only sessions (but we're NOT fixing this — quiz stats live in QuizAttempt instead)
- **Gap**: `QuizContent` never calls session API — all quiz state is client-side only
- **Gap**: `QuizResults` has no session/attempt ID props — can't persist completion
- **Gap**: Progress dashboard only shows card review stats — no quiz activity
- **Verified**: `ResultItem.passageId` exists in `study-types.ts:98` — can thread to QuizContent

## Key Design Decisions

- **StudySession = engagement tracking**: "How did the user study?" — which passage, which activities (quiz, chat, translate, summary), duration. Keeps existing card-review fields for backward compat.
- **QuizAttempt = performance tracking**: "How well did the user perform?" — correctCount, incorrectCount, totalQuestions, accuracyRate. Source of truth for quiz stats.
- **No stat duplication**: Quiz stats live in QuizAttempt only. StudySession does NOT get quiz counts written to it.
- **Meaningful interaction trigger**: Both StudySession and QuizAttempt created on **first answer submit** (not on question render, not on panel open).
- **Separate API**: `/api/quiz-attempt` endpoints, not mixed into `/api/study-session`.
- **Await creation**: Block on session + attempt creation before showing answer feedback.
- **New session per quiz attempt**: Each quiz attempt creates a fresh StudySession. Session reuse (e.g. quiz + chat in one session) deferred until other activity types are wired.

## Architecture

```
StudySession — "How did the user study?"
  ├── id, userId, passageId, startedAt, completedAt
  ├── cardsReviewed, newCards, correctCount, incorrectCount, accuracyRate (card-review legacy)
  └── quizAttempts QuizAttempt[]  (relation)

QuizAttempt — "How well did the user perform?"
  ├── id, studySessionId, userId, passageId
  ├── correctCount, incorrectCount, totalQuestions
  ├── accuracyRate (computed on completion)
  ├── startedAt, completedAt
  └── Index: [userId, startedAt]

Quiz Flow:
  1. User clicks "Check Answer" (first time)
  2. POST /api/study-session { passageId } → sessionId
  3. POST /api/quiz-attempt { studySessionId, passageId } → attemptId
  4. Show answer feedback
  5. ... answer all questions ...
  6. QuizResults mounts → PATCH /api/quiz-attempt { attemptId, counts }
  7. "Try Again" → reset state → new session + attempt on next first answer
```

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [QuizAttempt Model + API](./phase-01-quiz-attempt-model-and-api.md) | Done | 2h |
| 2 | [Quiz Flow Wiring](./phase-02-quiz-flow-wiring.md) | Done | 2.5h |
| 3 | [Progress Dashboard Update](./phase-03-progress-dashboard-update.md) | Done | 1h |
| 4 | [Tests](./phase-04-tests.md) | Done | 2h |

## Dependencies

- Phase 2 depends on Phase 1 (needs model + API endpoints)
- Phase 3 depends on Phase 2 (needs completed quiz attempts in DB)
- Phase 4 depends on all previous phases

## Related Code Files

- `prisma/schema.prisma` — add QuizAttempt model
- `src/lib/db/quiz-attempt-queries.ts` — create + complete attempt queries (NEW)
- `src/app/api/quiz-attempt/route.ts` — POST + PATCH endpoints (NEW)
- `src/app/api/study-session/route.ts` — existing POST endpoint, called from QuizContent
- `src/lib/db/study-session-queries.ts` — existing session queries, called by study-session API
- `src/features/study/study-quiz-content.tsx` — create session + attempt on first answer
- `src/features/study/study-quiz-results.tsx` — complete attempt on mount
- `src/features/study/study-right-panel.tsx` — thread passageId to QuizContent
- `src/features/study/study-types.ts` — ResultItem.passageId confirmed at line 98
- `src/lib/study/shared/study-response-schema.ts` — add QuizAttempt DTO
- `src/features/progress/progress-dashboard.tsx` — add quiz stats
- `src/app/api/progress/stats/route.ts` — include quiz attempt data
- `src/lib/db/card-review-queries.ts` — getUserProgress() raw query, add quiz stats

## Validation Log

### Session 1 — 2026-06-08
**Trigger:** User requested plan validation before implementation

#### Confirmed Decisions
1. StudySession = "How did the user study?" (engagement). QuizAttempt = "How well did the user perform?" (performance). Do not duplicate quiz stats into StudySession.
2. Meaningful interaction = first answer submit. Creates both StudySession + QuizAttempt simultaneously.
3. Separate `/api/quiz-attempt` endpoints (not mixed into study-session API).
4. Await creation before showing feedback.
5. StudySession keeps existing card-review fields for backward compat. No migration needed on StudySession.
6. No need to fix `computeSessionAccuracy` — it correctly queries card_reviews for card-review sessions. Quiz accuracy lives in QuizAttempt.

#### Phase Restructure
- Original 6 phases → 4 phases
- Old Phases 1+3 merged into new Phase 1 (model + API)
- Old Phases 2+3+5 merged into new Phase 2 (quiz flow wiring)
- Old Phase 4 → new Phase 3 (dashboard)
- Old Phase 6 → new Phase 4 (tests)
- Removed "fix computeSessionAccuracy" — not needed with QuizAttempt as separate truth

#### Verification Results
- **Tier:** Full (5+ phases)
- **Claims checked:** 15
- **Verified:** 14 | **Failed:** 0 | **Unverified:** 1
