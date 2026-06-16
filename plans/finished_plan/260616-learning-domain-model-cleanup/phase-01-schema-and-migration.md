# Phase 01 — Schema + Migration

## Overview

- Priority: P0 (foundation)
- Status: Completed
- In the multi-file schema (`prisma/schema/`): drop `QuizAttempt`, drop
  `QuestionReview`, add `QuizResult` (1:1 child of `StudioArtifact`). Regenerate +
  migrate.

## Requirements

- New `QuizResult` model (own file `prisma/schema/studio.prisma` alongside the artifact,
  or a dedicated file):
  - `id` uuid PK
  - `artifactId` uuid `@unique` → `StudioArtifact` (`onDelete: Cascade`)  — 1:1
  - `completedAt DateTime @default(now())`
  - `correctCount Int`
  - `totalQuestions Int`
  - `accuracyRate Float`
  - `@@map("quiz_results")`
- `StudioArtifact` gains `quizResult QuizResult?` back-relation. No quiz-specific scalar
  columns on the artifact (stays generic).
- Delete `model QuizAttempt` and remove relations: `UserProfile.quizAttempts`,
  `StudySession.quizAttempts`, `Passage.quizAttempts`.
- Delete `model QuestionReview` and remove relations: `UserProfile.questionReviews`,
  `Question.reviews`.
- `StudySession` otherwise unchanged.

## Related Code Files

Modify:
- `prisma/schema/studio.prisma` — add `QuizResult`; add `quizResult` relation to
  `StudioArtifact`; remove `Question.reviews` + `QuestionReview` model.
- `prisma/schema/study-session.prisma` — delete `QuizAttempt`; drop
  `StudySession.quizAttempts`.
- `prisma/schema/user.prisma` — drop `quizAttempts` + `questionReviews` relations.
- `prisma/schema/passage.prisma` — drop `quizAttempts` relation.

Generated (auto): `src/generated/prisma/**` via `pnpm exec prisma generate`.

Create: one migration dropping `quiz_attempts` + `question_reviews`, creating
`quiz_results`.

## Implementation Steps

1. Apply schema edits across the split files.
2. `pnpm exec prisma validate` + `pnpm exec prisma generate`.
3. Create migration (`pnpm db:migrate:dev --name learning_domain_cleanup` or align with
   the current init-migration approach).
4. `pnpm run typecheck` — expect downstream breaks (handled in 02/03); confirm only those.

## Migration filename

Domain slug only (e.g. `..._learning_domain_cleanup`). No plan/phase references in
filename or SQL.

## Todo

- [ ] Add `QuizResult` + relation
- [ ] Delete `QuizAttempt` + relations
- [ ] Delete `QuestionReview` + relations
- [ ] generate + migrate
- [ ] Typecheck (only expected downstream breaks)

## Success Criteria

- `prisma validate` passes; `quiz_results` exists; `quiz_attempts` + `question_reviews`
  dropped.

## Risk Assessment

- Data loss: dropping `quiz_attempts` + `question_reviews` discards rows (pre-release —
  confirm before any shared DB).
- Resolve the uncommitted init-migration state in the working tree before generating.
