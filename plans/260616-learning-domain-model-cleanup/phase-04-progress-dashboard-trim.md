# Phase 04 — Progress Dashboard Trim

## Overview

- Priority: P1
- Status: Not started
- Depends on: Phase 02, 03
- Reduce the progress dashboard to streak + study time only. Remove all card stats
  (backed by the now-deleted `question_reviews`) and all quiz stats (backed by the
  now-deleted `quiz_attempts`).

## Requirements

- `getUserProgress` returns only the surviving signals: streak, study-time
  (today/week), active days — all from `study_sessions`. No `quiz_attempts` or
  `question_reviews` queries remain.
- Dashboard removes these cards: Total Cards, Due for Review, Mature Cards,
  Today's Reviews, Quizzes Completed, Avg. Accuracy, Today's Quizzes — and the
  "cards due for review" call-to-action block.

## Related Code Files

Modify:
- `src/lib/db/quiz/quiz-review.ts` (or wherever `getUserProgress` lands after Phase 02)
  — trim return shape to streak/time fields; drop both removed aggregations.
- `src/features/progress/progress-dashboard.tsx` — remove the 7 stat cards + the
  due-review CTA; keep streak + study-time UI.
- Associated progress tests.

## Implementation Steps

1. Trim `getUserProgress` return object + queries (coordinate with Phase 02 which removes
   the `question_reviews` query; this phase also removes the `quiz_attempts` query).
2. Remove the card/quiz cards + CTA from the dashboard.
3. Update progress tests/fixtures.
4. `pnpm run typecheck` + `pnpm run lint`.

## Todo

- [ ] `getUserProgress` trimmed to streak/time
- [ ] 7 stat cards + CTA removed
- [ ] Tests updated
- [ ] Typecheck + lint green

## Success Criteria

- Progress dashboard renders streak + study time with no runtime errors and no
  references to removed stat fields.

## Risk Assessment

- Confirm `getUserProgress` consumers: progress route + dashboard only. The streak/time
  logic (`study_sessions`) must remain intact.
