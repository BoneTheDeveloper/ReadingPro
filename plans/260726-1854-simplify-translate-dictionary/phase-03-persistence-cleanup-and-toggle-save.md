---
title: "Phase 3: Persistence Cleanup + Unsaved Vocabulary"
status: pending
priority: P1
effort: 6h
dependencies: [phase-02-provider-and-cache]
---

# Phase 3: Persistence Cleanup + Unsaved Vocabulary

## Overview

Drop the seven DB tables (`translation_caches`, `translation_histories`, plus the four `dictionary_*`), the seed file, and any client/server code that still references them. Add a `toggleVocabularyItemAction` that does upsert + remove in one place. The popup's "Đã lưu" toggle calls it.

## Requirements

- Functional
  - Save flow upserts on `(userId, normalizedText, targetLanguage, normalizedTranslation)`, increments `savedCount`, appends a `VocabularyOccurrence` row each call.
  - Toggle-off removes the headword and its occurrences (reuses `deleteVocabularyItemById`).
  - Re-saving the same headword with a different `translation` creates a new headword row (the unique constraint is on translation too).
- Non-functional
  - `pnpm knip` green; no dead exports in dictionary or in the old translation feature.
  - Prisma regen produces a client with only `VocabularyItem`, `VocabularyOccurrence`, `VocabularySet`, `VocabularySetItem`, and the existing passage/user models.

## Architecture

- Schema (`prisma/schema.prisma`): drop the seven models, drop `VocabularySourceType.DICTIONARY`, drop `VocabularyItem.dictionaryEntryId` + `dictionarySenseId`.
- Migration: one SQL file drops the seven tables and the two optional columns on `vocabulary_items` (`SET NULL` first if any rows have values).
- New action: `src/features/vocabulary/server/actions/vocabulary.ts` exports `toggleVocabularyItemAction({ selectedText, translation, contextSentence, sourceId, sourceLanguage, targetLanguage })` — if a row exists for the unique key, delete; else upsert. Caller passes the same payload for both directions.
- `saveVocabularyInputSchema` no longer accepts `dictionaryEntryId` / `dictionarySenseId`.

## Related Code Files

Refer to the top-level **File Inventory** for full action+reason. This phase owns:

- rewrite: `prisma/schema.prisma`
- rewrite: `src/features/vocabulary/schemas/vocabulary.ts`
- rewrite: `src/features/vocabulary/server/services/vocabulary-items.ts`
- modify: `src/features/vocabulary/server/db/vocabulary-items.ts`
- modify: `src/features/vocabulary/server/actions/vocabulary.ts`
- modify: `package.json`
- create: `prisma/migrations/<timestamp>_drop_dictionary_and_translation_tables/migration.sql`
- delete: `prisma/seed.ts`
- delete: `prisma/data/dictionary/**`

Open the original schema file once; the rewrite must keep every other model byte-identical and only excise the seven tables + two columns + `DICTIONARY` enum.

## Implementation Steps

1. Edit `prisma/schema.prisma`: drop the seven model blocks, drop `VocabularySourceType.DICTIONARY`, drop the two `dictionaryEntryId` / `dictionarySenseId` columns on `VocabularyItem`.
2. Run `pnpm db:generate`.
3. Migration SQL:
   ```sql
   UPDATE vocabulary_items SET "dictionaryEntryId" = NULL, "dictionarySenseId" = NULL;
   ALTER TABLE vocabulary_items DROP COLUMN IF EXISTS "dictionaryEntryId";
   ALTER TABLE vocabulary_items DROP COLUMN IF EXISTS "dictionarySenseId";
   DROP TABLE IF EXISTS translation_caches CASCADE;
   DROP TABLE IF EXISTS translation_histories CASCADE;
   DROP TABLE IF EXISTS dictionary_entries CASCADE;
   DROP TABLE IF EXISTS dictionary_senses CASCADE;
   DROP TABLE IF EXISTS dictionary_translations CASCADE;
   DROP TABLE IF EXISTS dictionary_aliases CASCADE;
   DROP TABLE IF EXISTS dictionary_source_audits CASCADE;
   ```
4. Run `pnpm prisma migrate dev --name drop_dictionary_and_translation_tables`.
5. Remove `dictionaryEntryId` / `dictionarySenseId` from `saveVocabularyInputSchema` and from `SaveVocabularyItemInput` / `UpsertVocabularyItemParams`; `upsertVocabularyItem` writes no dictionary refs.
6. Add `toggleVocabularyItemAction`:
   ```ts
   export async function toggleVocabularyItemAction(input: {
     userId: string;
     selectedText: string;
     translation: string;
     contextSentence?: string;
     sourceId?: string;
     sourceLanguage: "en" | "vi";
     targetLanguage: "en" | "vi";
   }): Promise<{ saved: boolean; vocabularyItemId: string | null }> { … }
   ```
   Implementation: look up by unique key; if row exists, `deleteVocabularyItemById`; else `saveVocabularyItem`.
7. Delete `prisma/seed.ts`, `prisma/data/dictionary/**`, and the `db:seed:dictionary` script.
8. `pnpm knip` → fix any reported unused exports/files.

## Success Criteria

- [ ] One migration drops the seven tables and two columns; `pnpm prisma migrate status` clean.
- [ ] `pnpm knip` zero unused files or exports for the dictionary feature.
- [ ] `pnpm typecheck && pnpm lint` pass.
- [ ] Calling `toggleVocabularyItemAction` twice with the same payload: first call returns `{ saved: true, vocabularyItemId }`; second call returns `{ saved: false, vocabularyItemId: null }` and the row is gone.

## Risk Assessment

- Existing rows with non-null `dictionaryEntryId`: the migration's `UPDATE ... SET NULL` pre-step must run before the `ALTER TABLE`. If the migration is replayed in a clean DB the `SET NULL` is a no-op.
- `toggleVocabularyItemAction` deletes don't need a separate soft-delete path — the existing `deleteVocabularyItemById` already covers it.

## Security Considerations

- Zod schema stays `.strict()`; no `dictionaryEntryId` / `dictionarySenseId` accepted.
- The new action reuses `auth.api.getSession`; no public surface.