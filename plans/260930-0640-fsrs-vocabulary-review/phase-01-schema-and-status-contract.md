---
phase: 1
title: "Phase 1: Schema and status contract"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Schema and status contract

## Overview

Apply the whole schema change in one migration and carry the renamed status
through server, shared, and client code so the app compiles and behaves as before,
minus manual status editing. No review behavior yet.

## Context Links

- Design page, section "Schema đề xuất": https://claude.ai/artifact/X6mYdiorTZF1yE3e3o2d3X
- `prisma/schema.prisma`, `prisma.config.ts` (migrations path `prisma/migrations`, not yet created)
- `src/shared/enums.ts`, `src/server/lib/enum-sync.ts`

## Requirements

- [x] Schema matches the design exactly, plus `ReviewLog.learningSteps Int`.
- [x] `prisma/migrations` exists with one migration for the full change.
- [x] No code references `learningstatus`, `nextReviewAt`, `lastReviewedAt`, `MEMORIZED`, `VocabularySetType`, or `GENARATED`.
- [x] The client cannot set a word's status.

## Related Code Files

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_vocabulary_spaced_repetition/migration.sql` (generated)
- Modify: `src/shared/enums.ts`, `src/server/lib/enum-sync.ts`
- Modify: `src/shared/vocabulary/schema.ts`
- Modify: `src/server/modules/vocabulary/vocabulary-crud.ts`
- Modify: `src/client/features/vocabulary/components/vocabulary-list.tsx`, `vocabulary-form-dialog.tsx`, `vocabulary-page.tsx`
- Modify: any other writer of `updatedAt` on `UserProfile` or `VocabularyItem` (check `src/server/modules/auth/auth.ts`)

## Implementation Steps

1. **Back up.** Run `pg_dump "$DATABASE_URL" > <scratch>/readingpro-before-fsrs.sql`
   outside the repo. Do not commit it.
2. **Edit `prisma/schema.prisma`:**
   - `UserProfile`: add `timezone String @default("Asia/Bangkok")`,
     `desiredRetention Float @default(0.9)`, `dailyNewLimit Int @default(10)`,
     `fsrsParams Json?`, relation `reviewSessions ReviewSession[]`; change
     `updatedAt` to `@updatedAt`.
   - `User.updatedAt`: add `@updatedAt`.
   - `Passage`: add `vocabularyItems VocabularyItem[]`.
   - `VocabularyItem`: remove `learningstatus`, `nextReviewAt`, `lastReviewedAt`;
     add `contextSentence String?`, `passageId String? @db.Uuid` with relation
     `onDelete: SetNull`, `status VocabularyStatus @default(NEW)`,
     `dueAt DateTime @default(now())`, `stability Float @default(0)`,
     `difficulty Float @default(0)`, `scheduledDays Int @default(0)`,
     `learningSteps Int @default(0)`, `reps Int @default(0)`,
     `lapses Int @default(0)`, `lastReviewAt DateTime?`, `reviewLogs ReviewLog[]`;
     `updatedAt @updatedAt`; indexes `@@index([userId, dueAt])` and
     `@@index([userId, status])` replace the two old ones.
   - `VocabularySet`: keep `id`, `userId`, `name`, `createdAt`; drop `type`,
     `periodStart`, `periodEnd`, `updatedAt`, the old unique and index; add
     `reviewSessions ReviewSession[]` and `@@unique([userId, name])`.
   - `VocabularySetItem`: drop `id`, `addedAt`, the old unique; add
     `@@id([vocabularySetId, vocabularyItemId])` and `@@index([vocabularyItemId])`.
   - Add `ReviewSession` and `ReviewLog` as in the design. In `ReviewLog` add
     `learningSteps Int` next to `scheduledDays`.
   - Enums: `VocabularyStatus { NEW LEARNING REVIEW RELEARNING }`, new
     `ReviewRating { AGAIN HARD GOOD EASY }`, delete `VocabularySetType`.
3. **Create the migration.** Run
   `pnpm exec prisma migrate dev --name vocabulary_spaced_repetition`.
   If Prisma reports drift and asks to reset the database, stop and ask the user;
   a reset deletes users and passages too. After approval, run
   `pnpm exec prisma migrate reset` and then the migrate command again.
4. **Shared enums.** In `src/shared/enums.ts` replace `VocabularyStatus` with the
   four values and add `ReviewRating`. In `src/server/lib/enum-sync.ts` add the
   `ReviewRating` assertion.
5. **Shared schema** (`src/shared/vocabulary/schema.ts`):
   - `VocabularyItemSchema`: rename `learningstatus` to `status` (no default);
     add `dueAt: z.coerce.date()`, `contextSentence: z.string().nullable()`,
     `passageId: z.string().uuid().nullable()`.
   - `VocabularyUpdateInputSchema`: remove the status field.
   - `VocabularyStatsSchema`: `{ total, new, learning, review, relearning }`.
   - Rewrite `VocabularySetSchema` in phase 3, not here; keep it compiling.
6. **Server** (`vocabulary-crud.ts`): stop writing status in update; group stats by
   `status` into the four buckets; remove every manual `updatedAt: new Date()`.
7. **Client:**
   - `vocabulary-list.tsx`: status order, labels, and styles for the four values:
     Mới, Đang học, Đang ôn, Học lại. Read `item.status`.
   - `vocabulary-form-dialog.tsx`: remove the status select and the
     `learningstatus` form value.
   - `vocabulary-page.tsx`: filter on `item.status`; drop status from
     `handleDialogSubmit`; show the four stats instead of `known`.
8. Run `pnpm db:generate`, then the verification commands.

## Todo

- [x] Database dump taken
- [x] Schema edited and migration created
- [x] Shared enums and enum sync updated
- [x] Shared vocabulary schema updated
- [x] Server CRUD and stats updated
- [x] Client labels, filter, and form updated
- [x] Verification passed

## Success Criteria

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `git grep -n "learningstatus\|nextReviewAt\|lastReviewedAt\|MEMORIZED\|GENARATED\|VocabularySetType" -- src prisma/schema.prisma` returns nothing.
- `pnpm exec prisma migrate status` reports the database is up to date.
- Manual: create, edit, and delete a word on `/vocabulary`; the new word shows
  "Mới"; the edit dialog has no status field; the filter lists four statuses.
- `curl -X PATCH /api/vocabulary/<id>` with `"status":"REVIEW"` in the body leaves
  the row's status as NEW.

## Risk Assessment

- **Data loss on reset.** Mitigated by the dump and the confirmation stop.
- **`User.updatedAt` and better-auth.** better-auth writes this column itself;
  `@updatedAt` only adds a Prisma-side default and does not conflict. If
  better-auth's schema check complains, revert that single attribute.
- **Rollback:** `git revert` the commit, then restore the dump with `psql`.

## Security Considerations

Status, due date, and FSRS columns must never be accepted from request bodies.
Zod strips unknown keys by default; keep the update schema free of those fields.

## Next Steps

Unblocks phases 2, 3, and 4.
