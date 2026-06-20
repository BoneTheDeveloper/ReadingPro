# Spaced Repetition Flow

The app schedules review of saved **vocabulary items** only. There is no separate
SM-2 card-review subsystem — the earlier `QuestionReview` / `/api/cards/*` path was
removed. Vocabulary uses a lightweight fixed-interval schedule with three states.

## Vocabulary Review

```text
Vocabulary item saved
  -> status = NEW, nextReviewAt = now + 1 day
  -> learner reviews item: POST /api/vocabulary/[id]/review { isCorrect }
  -> NEW (any result)       -> status = LEARNING, nextReviewAt = now + 1 day
  -> LEARNING + correct     -> status = MASTERED, nextReviewAt = null
  -> LEARNING + incorrect   -> status = LEARNING, nextReviewAt = now + 1 day
  -> MASTERED + incorrect   -> status = LEARNING, nextReviewAt = now + 1 day
  -> MASTERED (no scheduled review)
  -> Manual override allowed via PATCH /api/vocabulary/[id]/status
```

Status transitions:

```text
NEW       --(first review, any result)--> LEARNING
LEARNING  --(correct)--> MASTERED
LEARNING  --(incorrect)--> LEARNING   (interval stays +1d)
MASTERED  --(incorrect)--> LEARNING   (interval +1d)
```

Review scheduling (`simpleSchedule`):

| Current status | Review result | Next status | nextReviewAt |
|----------------|---------------|-------------|--------------|
| NEW            | correct or incorrect | LEARNING | now + 1 day |
| LEARNING       | correct       | MASTERED    | null |
| LEARNING       | incorrect     | LEARNING    | now + 1 day |
| MASTERED       | incorrect     | LEARNING    | now + 1 day |
| MASTERED       | correct       | MASTERED    | null |

This is a fixed-interval MVP per ADR 0005. The review outcome is a boolean
(`isCorrect`) — there is no 0-5 quality rating, `easeFactor`, or `repetitions`
count. Items due for review are surfaced through the vocabulary list filtered by
`nextReviewAt`; there is no dedicated `/api/vocabulary/due` route.

## Routes

| Route | Purpose |
|-------|---------|
| `POST /api/vocabulary/[id]/review` | Submit a review result (`{ isCorrect }`); advances status and reschedules `nextReviewAt`. |
| `PATCH /api/vocabulary/[id]/status` | Manually override item status (NEW/LEARNING/MASTERED). |
| `POST /api/study/sessions` | Ensure an active study session window. |
| `GET /api/progress/stats` | Return aggregate user progress (streak, time studied, active days). |

## Code Paths

- Schedule logic: `src/server/modules/spaced-repetition/scheduler.ts` (`simpleSchedule`)
- Vocabulary review write: `src/server/db/vocabulary-queries.ts` (`reviewVocabularyItem`)
- Progress UI: `src/features/progress/progress-dashboard.tsx`
