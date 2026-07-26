---
title: "Phase E: Schema Drop + Studio Detail"
phase: e
status: pending
priority: P1
effort: 6h
dependencies: [phase-d-save-toggle]
---

# Phase E: Schema Drop + Studio Detail

## Overview

Drop the seven DB tables + two `vocabulary_items` columns in one migration. Build the Studio Translation tab; `Chi tiết` triggers a `fetch('/api/translate?full=1', …)` and renders the rich payload.

## Requirements

- Functional
  - One Prisma migration drops the seven tables and two columns.
  - `pnpm prisma migrate status` clean.
  - Clicking `Chi tiết` in the popup fetches the rich payload via the same route (with `?full=1`) and renders it in the Studio panel under a "Translation" tab.
  - The Studio Translation tab does not displace existing artifact rows.
- Non-functional
  - `pnpm typecheck && pnpm lint && pnpm knip` green.

## Architecture

- Migration SQL:
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
- Route handler (`app/api/translate/route.ts`): when `?full=1` is present, call `getFullTranslation` (Phase E service) instead of the compact `executeTranslate`. Return a richer DTO.
- `translation-detail-card.tsx` renders the payload as a definition list. Reads from `useFullTranslation` hook.

## Related Code Files

Refer to top-level **File Inventory** in `plan.md`.

This phase owns:
- rewrite: `prisma/schema.prisma`
- modify: `src/features/vocabulary/schemas/vocabulary.ts`
- rewrite: `src/features/vocabulary/server/services/vocabulary-items.ts`
- modify: `src/features/vocabulary/server/db/vocabulary-items.ts`
- delete: `prisma/seed.ts`
- delete: `prisma/data/dictionary/**`
- modify: `package.json`
- create: `prisma/migrations/<timestamp>_drop_dictionary_and_translation_tables/migration.sql`
- create: `src/features/reading/server/services/full-translation.ts`
- create: `src/features/reading/hooks/use-translation-selection.ts`
- create: `src/features/reading/hooks/use-full-translation.ts`
- create: `src/features/reading/components/translation-detail-card.tsx`
- modify: `src/app/api/translate/route.ts` (add `?full=1` branch)
- modify: `src/features/reading/components/content-panel.tsx` (add Studio Translation tab)

## Implementation Steps

1. Rewrite `prisma/schema.prisma` from scratch. Drop the seven `model {}` blocks, drop `VocabularySourceType.DICTIONARY`, drop the two columns on `vocabulary_items`. **Keep every other model byte-identical.**
2. Run `pnpm db:generate`.
3. Create the migration SQL (above).
4. Run `pnpm prisma migrate dev --name drop_dictionary_and_translation_tables`.
5. Drop `dictionaryEntryId` / `dictionarySenseId` from `saveVocabularyInputSchema`, `SaveVocabularyItemInput`, `UpsertVocabularyItemParams`. Update `upsertVocabularyItem` `create` payload.
6. Delete `prisma/seed.ts`, `prisma/data/dictionary/**`, and the `db:seed:dictionary` script in `package.json`.
7. Create `src/features/reading/server/services/full-translation.ts`:
   ```ts
   export async function getFullTranslation(input): Promise<
     | { kind: "word"; word: string; ipa: null; pos: null; meanings: string[] }
     | { kind: "phrase"; text: string; language: "vi" }
   > {
     const translation = await translateWithGoogle({ text: input.text, sourceLanguage: "en", targetLanguage: "vi" });
     if (input.kind === "phrase") return { kind: "phrase", text: translation ?? "(không có)", language: "vi" };
     // Word: split the translation on "," and cap at 2 entries
     const meanings = (translation ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 2);
     return { kind: "word", word: input.text, ipa: null, pos: null, meanings };
   }
   ```
8. Create `use-translation-selection.ts` (helper `translationKind(text)`).
9. Create `use-full-translation.ts` (hook calling `fetch('/api/translate?full=1', …)`).
10. Update `route.ts`: if `req.nextUrl.searchParams.has("full")`, call `getFullTranslation` instead.
11. Create `translation-detail-card.tsx`: definition-list render of the rich payload.
12. Update `content-panel.tsx`: when `useFullTranslation.data` is non-null, render `<TranslationDetailCard>` under a new "Translation" tab in the Studio panel. Existing artifact rows remain unchanged.
13. `pnpm knip` → fix any reported unused exports.

## Success Criteria

- [ ] `pnpm prisma migrate status` clean; the seven tables and two columns are gone.
- [ ] Clicking `Chi tiết` in the popup renders the Studio Translation tab within 1s on a warm cache.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` all green.

## Risk Assessment

- Existing rows with non-null `dictionaryEntryId`: migration's `UPDATE SET NULL` pre-step must run before `ALTER TABLE`. Idempotent on a clean DB.
- Studio panel currently hosts artifact rows for the active passage; the new Translation tab must not displace them. Use additive tab routing.

## Security Considerations

- The route keeps Zod `.strict()` and reuses auth + passage ownership check.
- Direction locked to EN↔VI at the schema layer.

## Open Questions

- Word definition extraction heuristic (split on `,`, cap at 2). Acceptable for MVP; revisit after feedback.
- Studio Translation tab persistence across passage switches: closed on switch, fresh fetch on Chi tiết re-click.