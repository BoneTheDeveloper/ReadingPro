---
phase: 1
title: "Database schema & migration"
status: completed
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Database schema & migration

## Overview

Rename the artifact model/table to the `Studio` vocabulary, drop the unused `content` jsonb,
and add `artifactId` to `Question` so quiz content is keyed by artifact (the type-specific
relational store). Land it all in one fresh migration.

## Requirements

- Functional: `db.studioArtifact` accessor exists; `Question.artifactId` NOT NULL FK exists and indexed;
  no `content` column on the artifact table.
- Non-functional: single migration; existing `questions` rows wiped to satisfy NOT NULL; Prisma client regenerated.

## Architecture

`StudioArtifact` = common registry of generated outputs (type, title, status, timestamps).
Content lives in **per-type** tables linked by `artifactId`:

```
StudioArtifact (studio_artifacts)        Question (questions)
  id        uuid pk        <-------------  artifactId uuid fk (Cascade)
  passageId uuid                           passageId  uuid (kept: passage-wide review pool)
  userId    text                           ... question fields
  type      'quiz'|'flashcard'
  title / status / timestamps
  (NO content column)
```

Flashcard, when built, gets its own table with its own `artifactId` FK — never reuses the quiz table.

## Related Code Files

- Modify: `prisma/schema.prisma`
  - Rename `model StudyArtifact` → `model StudioArtifact`; `@@map("study_artifacts")` → `@@map("studio_artifacts")`.
  - Delete `content Json?` line and its stale comment; fix stale `type` comment to `'quiz' | 'flashcard'`.
  - Rename relation field `studyArtifacts` → `studioArtifacts` on `UserProfile` and `Passage`, retype to `StudioArtifact[]`.
  - `model Question`: add `artifactId String @db.Uuid` (**NOT NULL** — see Risk), relation
    `artifact StudioArtifact @relation(fields: [artifactId], references: [id], onDelete: Cascade)`,
    and `@@index([artifactId])`. Add reverse `questions Question[]` to `StudioArtifact`.
- Create: `prisma/migrations/<timestamp>_studio_artifact_model/migration.sql` (via migrate dev).
  - Because `artifactId` is NOT NULL and `questions` has dev rows, the migration must **wipe
    existing questions first** (`DELETE FROM questions;` — cascades to `question_reviews`) so the
    NOT NULL column can be added. Prisma migrate dev will flag this; accept the data loss (dev only).

## Implementation Steps

1. Edit `prisma/schema.prisma` per Related Code Files. Keep `passageId` on `Question`.
2. `pnpm run db:generate` — confirm `db.studioArtifact` and `Question.artifactId` typecheck.
3. `pnpm db:migrate:dev --name studio_artifact_model` to emit + apply the migration.
4. Sanity-check generated SQL: `CREATE TABLE studio_artifacts`, `ALTER TABLE questions ADD COLUMN artifactId`,
   FK + index present, no `content` column.

## Success Criteria

- [ ] `db.studioArtifact` exists; `db.studyArtifact` gone.
- [ ] `Question.artifactId` present, **NOT NULL**, FK to `studio_artifacts` with `onDelete: Cascade`, indexed.
- [ ] No `content` column on `studio_artifacts`; stale comments removed.
- [ ] Existing `questions` rows wiped by the migration (dev data loss accepted).
- [ ] `pnpm run db:generate` + `pnpm run typecheck` clean (service/actions errors expected until Phase 2 — note them, don't fix here).

## Risk Assessment

- **`artifactId` NOT NULL on a non-empty table:** the migration must `DELETE FROM questions` before/with
  adding the column, cascading to `question_reviews`. Confirmed acceptable (dev-only data, decided in
  validation). The generation path (Phase 2) always sets `artifactId`, so no live insert breaks.
- **Old quizzes disappear:** wiping removes pre-existing questions; those passages show no quiz until
  regenerated. Accepted in validation — no backfill.
- **Renaming relation fields** touches any query using `passage.studyArtifacts` — grep confirms **no
  code references** it (only the schema + service), so the rename is low-risk.
