---
phase: 2
title: "Dedup Store Strategy & Migration"
status: pending
priority: P1
effort: "2.5h"
dependencies: [1]
---

# Phase 2: Dedup Store Strategy & Migration

## Overview

Change the vocabulary identity key so "same meaning" is compared on a **normalized**
translation. Adds a `normalizedTranslation` column and switches the unique constraint.

**Migration is simple: the dev DB is reset, so there is no existing data to backfill or
merge.** All the duplicate-merge complexity (backfill parity, survivor SRS reconciliation,
set-item/occurrence repoint, locking, rollback snapshots) is **out of scope** — it only
applies to migrating live production rows, which do not exist here.

## Requirements

- **Functional:**
  - Identity key = `userId + normalizedText + targetLanguage + normalizedTranslation`.
  - `normalizedTranslation = normalizeText(translation)` (lowercase + collapse-spaces + trim).
  - Same word + same normalized meaning → update in place, `savedCount++`.
  - Same word + different normalized meaning → new item.
  - Raw `translation` + `displayText` preserved from first save for display.
- **Non-functional:** No second normalization implementation — `normalizeText` (JS) is the
  single source of truth; there is no SQL backfill to drift from it.

## Architecture

`normalizedTranslation` mirrors the existing `normalizedText`/`displayText` split:
normalized value drives the key, raw value drives display.

- **Schema** (`prisma/schema/vocabulary.prisma`):
  - add `normalizedTranslation String` (no `@default("")` — fresh column on a reset DB;
    every write sets it).
  - change `@@unique([userId, normalizedText, targetLanguage, translation])` →
    `@@unique([userId, normalizedText, targetLanguage, normalizedTranslation])`.
- **Query** (`vocabulary-queries.ts`): compute `normalizedTranslation` via `normalizeText`;
  set it on create; key the upsert `where` on it (not raw `translation`). `update` branch
  unchanged (savedCount++, updatedAt; SRS state preserved).
- **Dead code (H4):** delete the unused `saveVocabularyItem` in
  `src/server/db/translation-queries.ts:123-184` (confirmed no callers — the route uses
  `vocabulary.service.saveVocabularyItem`). It upserts on the old composite key
  (`userId_normalizedText_targetLanguage_translation`, line 131), so the rename would
  break its typecheck. Remove it and any now-unused local helpers.
- **Migration:** `pnpm run db:migrate:dev` to generate the column + unique change, then
  reset (`prisma migrate reset`) since the dev DB is disposable. No custom SQL.

## Related Code Files

- Modify: `prisma/schema/vocabulary.prisma`
- Modify: `src/server/db/vocabulary-queries.ts` (`upsertVocabularyItem`, key build)
- Modify/Delete: `src/server/db/translation-queries.ts` (remove dead `saveVocabularyItem`)
- Create: `prisma/migrations/<ts>_vocabulary_normalized_translation_key/migration.sql` (generated)
- Test (unit): normalization/key-build test (pure, no DB)

## Implementation Steps (TDD)

1. **RED (pure unit):** test the key-building helper / `normalizeText` applied to the
   translation — e.g. `"Chạy"`, `"chạy"`, `"  chạy  "` all normalize equal; `"chạy"` ≠
   `"chạy bộ"`. No DB needed. This is the automated guard for the discriminator logic.
2. **GREEN (schema+query):** add the column + change the unique in schema; update
   `upsertVocabularyItem` to compute and key on `normalizedTranslation`.
3. **Delete dead `saveVocabularyItem`** from `translation-queries.ts`; confirm no
   remaining references; `pnpm run typecheck`.
4. Run the generated migration; `prisma migrate reset`; regenerate Prisma client.
5. Re-run the unit test + existing vocab suite (mocked) → green.

## Manual Verification (against dev DB — replaces a real-DB test harness)

The suite mocks Prisma by design (`tests/vitest/setup/vitest.setup.ts`), so dedup is
verified by hand against the dev DB. Run these and confirm via `psql` or the list route:

- [ ] Save "run"→"chạy" twice → **1 item**, `savedCount = 2`.
- [ ] Save "run"→"chạy" then "run"→"chạy bộ" → **2 items**.
- [ ] Save "run"→"Chạy" then "run"→"chạy" → **1 item** (case normalized).
- [ ] Same item, two different `sourceId` → 1 item, **2 occurrences**.

## Success Criteria

- [ ] Pure normalization/key unit test green (the four discriminator cases).
- [ ] `normalizedTranslation` column + new `@@unique`; client regenerated.
- [ ] `upsertVocabularyItem` keys on normalized translation; raw translation preserved.
- [ ] Dead `saveVocabularyItem` removed from `translation-queries.ts`; typecheck clean.
- [ ] Manual dev-DB verification checklist passes.
- [ ] Existing vocab tests still green.

## Risk Assessment

- **Low risk** given the resettable dev DB — no data migration hazards.
- Watch the Prisma-generated upsert key name change after the rename: it propagates to
  any code referencing the old composite key (the dead `translation-queries` function is
  the only such site — deleted in step 3).
- Dedup correctness is verified by the pure unit test (logic) + manual dev-DB checklist
  (end-to-end), since the automated suite is mock-based.
