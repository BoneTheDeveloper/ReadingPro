---
phase: 4
title: "Study Chat and Learning Loop Polish"
status: pending
priority: P2
effort: "3-4d"
dependencies: [2]
---

# Phase 4: Study Chat and Learning Loop Polish

## Overview

Harden study chat states and implement the vocabulary data model from ADR 0005. This phase restructures vocabulary storage into a two-table model (VocabularyItem + VocabularyOccurrence), adds vocabulary sets with auto-generated daily/weekly sets, extends save to dictionary lookups, and adds a vocabulary status/review scheduling foundation.

## Requirements

- Functional: study chat handles history loading, empty states, streaming, stop, retry, invalid responses, auth failures, and persistence failures predictably; vocabulary items are deduped by normalized text + translation, tracked across passages via occurrences, organized into auto and manual sets, and sourced from both translate and dictionary.
- Non-functional: chat remains passage-grounded, prompt-injection defensive, bounded by message/content limits, and tested at route and component levels; vocabulary queries are user-scoped and paginated.

## Architecture

Study chat (already working): `StudyChatPanel` uses AI SDK `useChat` with `DefaultChatTransport`, loads history from `GET /api/study-chat`, and sends messages to `POST /api/study-chat`. Chat is original-passage-only; mode switching is deferred.

Vocabulary data model (ADR 0005): `VocabularyItem` stores one entry per normalized word + translation per user, with status (NEW/LEARNING/MASTERED), savedCount, nextReviewAt, and optional dictionaryEntryId/dictionarySenseId. `VocabularyOccurrence` stores each context/passage where the word was encountered. `VocabularySet` (MANUAL/DAILY/WEEKLY) groups items. `VocabularySetItem` is the join table.

Save flow: normalize text → upsert VocabularyItem → lookup DictionaryEntry for enrichment → create VocabularyOccurrence → find/create daily + weekly sets → add to sets. See `docs/Flows/vocabulary-flow.md`.

## Related Code Files

- Create: `prisma/migrations/XXXX_add_vocabulary_occurrences_sets.sql`
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/vocabulary/route.ts`
- Create: `src/app/api/vocabulary/list/route.ts`
- Create: `src/app/api/vocabulary/[id]/status/route.ts`
- Create: `src/app/api/vocabulary/[id]/route.ts`
- Create: `src/app/api/vocabulary/sets/route.ts`
- Create: `src/app/api/vocabulary/sets/[id]/route.ts`
- Create: `src/app/api/vocabulary/sets/[id]/items/route.ts`
- Create: `src/lib/db/vocabulary-queries.ts`
- Create: `src/lib/db/vocabulary-set-queries.ts`
- Modify: `src/lib/db/translation-queries.ts`
- Modify: `src/lib/study/shared/study-response-schema.ts`
- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-translate-panel.tsx`
- Create: `src/features/vocabulary/vocabulary-page-client.tsx`
- Create: `src/features/vocabulary/vocabulary-list.tsx`
- Create: `src/features/vocabulary/vocabulary-item-card.tsx`
- Create: `src/features/vocabulary/vocabulary-set-list.tsx`
- Create: `src/app/[locale]/vocabulary/page.tsx`
- Modify: `tests/vitest/integration/api/study-chat-route.test.ts`
- Modify: `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx`
- Create: `tests/vitest/integration/api/vocabulary-crud-routes.test.ts`
- Create: `tests/vitest/integration/api/vocabulary-set-routes.test.ts`
- Modify: `docs/API/Routes/vocabulary-feature.md`
- Create: `docs/Flows/vocabulary-flow.md` (done)
- Modify: `docs/Flows/spaced-repetition-flow.md`
- Create: `docs/ADR/0005-vocabulary-review-mvp-path.md` (done)

## Implementation Steps

### A. Study chat hardening (already partially done)

1. Fill test gaps in `study-chat-route.test.ts`: invalid JSON for POST, message count limit exceeded (24), user text part char limit (2000), assistant message persistence failure path.
2. Fill test gaps in `study-chat-panel.integration.test.tsx`: fetch failure → empty state, error bar visible when `status === "error"`.
3. Steps 3-4 from original plan are already done (GET ownership enforced, mode switching deferred, docs current).

### B. Schema migration

4. Add `VocabularySetType` enum to `prisma/schema.prisma`. Status/type/source use plain `String` fields (not enums) per ADR 0005.
5. Restructure `VocabularyItem`: rename `selectedText` → `normalizedText`, add `displayText`, `type` (WORD|PHRASE as string), `source` (TRANSLATE|DICTIONARY as string), `status` (NEW|LEARNING|MASTERED as string), `savedCount`, `nextReviewAt`, `lastReviewedAt`, `dictionaryEntryId`, `dictionarySenseId`. Remove `normalizedKey` unique column, remove `sourceId` FK to Passage (passage reference moves to VocabularyOccurrence), remove `contextSentence`. Change unique constraint to `@@unique([userId, normalizedText, targetLanguage, translation])`. Remove the Passage relation — VocabularyItem no longer belongs to a specific passage.
6. Create `VocabularyOccurrence` model with `vocabularyItemId`, `sourceId` (nullable, no FK — lightweight reference to passage), `selectedText`, `contextSentence`. Uses `gen_random_uuid() @db.Uuid` IDs consistent with existing schema convention.
7. Create `VocabularySet` and `VocabularySetItem` models with `VocabularySetType` enum.
8. Write migration: collapse existing per-passage duplicates into single items + occurrences, preserving most recent data per dedup group. Drop the old `@@index([userId, sourceId, createdAt])`, add new `@@index([userId, status])` and `@@index([userId, nextReviewAt])`.

### C. Vocabulary queries and routes

10. Create `src/lib/db/vocabulary-queries.ts` with upsert, list (paginated, filterable by status/search), update status, delete, and occurrence creation.
11. Create `src/lib/db/vocabulary-set-queries.ts` with find-or-create daily/weekly sets, create manual set, add/remove items, list sets with counts, delete set.
12. Rewrite `POST /api/vocabulary/route.ts` to implement the new save flow (normalize → upsert item → enrich from dictionary → create occurrence → add to daily + weekly sets).
13. Create `GET /api/vocabulary/list/route.ts` for paginated vocabulary list.
14. Create `PATCH /api/vocabulary/[id]/status/route.ts` for manual status override.
15. Create `DELETE /api/vocabulary/[id]/route.ts` for item removal.
16. Create set CRUD routes: list sets, create manual set, update set name, delete set, add/remove items.

### D. Dictionary save integration

17. Extend dictionary entry detail UI with "Save to vocabulary" button.
18. Wire dictionary save to `POST /api/vocabulary` with `source: "DICTIONARY"`, `dictionaryEntryId`, `dictionarySenseId`.

### E. Vocabulary page UI

19. Create vocabulary page route at `src/app/[locale]/vocabulary/page.tsx`.
20. Create `vocabulary-page-client.tsx` with tabs: all words, by status (NEW/LEARNING/MASTERED), sets view.
21. Create `vocabulary-item-card.tsx` showing displayText, translation, status badge, savedCount, source badge, last reviewed date, expand to see occurrences.
22. Create `vocabulary-set-list.tsx` showing auto sets (daily/weekly) and manual sets with item counts.

### F. Tests

23. Create `vocabulary-crud-routes.test.ts`: save from translate, save from dictionary, dedup behavior, status update, delete, pagination.
24. Create `vocabulary-set-routes.test.ts`: auto daily/weekly set creation on save, manual set CRUD, add/remove items, unique constraints.
25. Verify all existing tests still pass after schema migration.

### G. Docs

26. Update `docs/API/Routes/vocabulary-feature.md` with new routes, request/response shapes.
27. Update `docs/Flows/spaced-repetition-flow.md` to mention vocabulary review as separate from card review.
28. `docs/Flows/vocabulary-flow.md` and `docs/ADR/0005-vocabulary-review-mvp-path.md` are already current.

## Success Criteria

- [ ] Study chat route tests cover validation, auth, ownership, history, message limits, and persistence failures.
- [ ] Study chat component tests cover load, empty, error, streaming, stop, retry, and passage-switch states.
- [ ] Chat remains original-passage grounded and message/content limits are preserved.
- [ ] VocabularyItem + VocabularyOccurrence two-table model is migrated and existing data is preserved.
- [ ] Save from translate creates item + occurrence + adds to daily/weekly sets.
- [ ] Save from dictionary creates item with dictionaryEntryId + dictionarySenseId.
- [ ] Dedup by `userId + normalizedText + targetLanguage + translation` works correctly (same word same translation = update, same word different translation = new item).
- [ ] Vocabulary sets (MANUAL/DAILY/WEEKLY) CRUD works with proper unique constraints.
- [ ] Vocabulary page renders items with status, source, savedCount, and occurrences.
- [ ] Route tests cover vocabulary CRUD, set CRUD, and dedup edge cases.
- [ ] `pnpm run test` passes for all study chat, vocabulary, cards, and progress-related suites.

## Risk Assessment

Risk: streaming test mocks can become brittle against AI SDK internals. Mitigation: test route validation and transport setup separately from AI SDK token streaming details.

Risk: migration collapsing existing duplicates may lose data if not handled carefully. Mitigation: write migration with explicit duplicate resolution (keep most recent, create occurrences for dropped rows), test on staging data first.

Risk: auto-set creation on every save adds write amplification. Mitigation: find-or-create is idempotent via unique constraint; daily/weekly sets are small (one per period). Acceptable for MVP scale.
