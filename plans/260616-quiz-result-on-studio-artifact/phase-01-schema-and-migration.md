# Phase 01 — Schema + Migration

## Overview

- Priority: P0 (foundation)
- Status: Not started
- Add quiz-result fields to `StudioArtifact`; remove `QuizAttempt` model and all its
  relations; regenerate Prisma client + write migration.

## Requirements

- `StudioArtifact` gains nullable result fields:
  - `attemptCompletedAt DateTime?`
  - `correctCount Int?`
  - `totalQuestions Int?`
  - `accuracyRate Float?`
- `QuizAttempt` model deleted; `quiz_attempts` table dropped.
- Relations removed: `UserProfile.quizAttempts`, `StudySession.quizAttempts`,
  `Passage.quizAttempts`.
- `StudySession` otherwise unchanged.

## Related Code Files

Modify:
- `prisma/schema.prisma` — add fields to `StudioArtifact`; delete `model QuizAttempt`;
  remove the three `quizAttempts` relation lines.

Generated (auto, do not hand-edit):
- `src/generated/prisma/**` — via `pnpm prisma generate`.

Create:
- New migration under `prisma/migrations/` (drop `quiz_attempts`, alter
  `studio_artifacts`). Coordinate with the current uncommitted init migration: either
  fold into the init migration if it is not yet applied anywhere, or add a discrete
  migration. Pick whichever matches the repo's active migration strategy.

## Implementation Steps

1. Edit `prisma/schema.prisma` per Requirements.
2. `pnpm prisma generate` (refresh client types).
3. Create migration (`pnpm prisma migrate dev --name quiz_result_on_studio_artifact`
   or align with init-migration approach).
4. `pnpm run typecheck` — expect breakages in files referencing `QuizAttempt`
   (handled in phase 02/03); confirm only those, not schema errors.

## Migration filename

Use a domain slug only — e.g. `..._quiz_result_on_studio_artifact`. No phase/plan
references in the filename or SQL comments.

## Todo

- [ ] Add 4 result fields to `StudioArtifact`
- [ ] Delete `QuizAttempt` model + 3 relations
- [ ] `prisma generate`
- [ ] Write/align migration
- [ ] Typecheck (only expected downstream breaks)

## Success Criteria

- `prisma validate` passes; client regenerated.
- `studio_artifacts` has the 4 new columns; `quiz_attempts` table gone.

## Risk Assessment

- Data loss: dropping `quiz_attempts` discards attempt rows (acceptable pre-release —
  confirm before applying to any shared DB).
- Migration tangle with the uncommitted init migration in the working tree — resolve
  the init migration state first.
