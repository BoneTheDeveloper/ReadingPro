---
title: "Simplify Translate + Dictionary"
description: "Rewrite inline translate end-to-end against translate.googleapis.com with a memory cache, two popup layouts (word vs phrase), studio-driven detail view, and upsert-on-save vocabulary. Drop the dictionary feature. Delete the seven cache/history/dictionary tables."
status: pending
priority: P1
effort: 2d
branch: preview
tags: [refactor, backend, frontend, vocabulary]
blockedBy: []
blocks: []
created: 2026-07-26
---

# Simplify Translate + Dictionary

## Overview

Replace the dead inline-translate pipeline with a small, end-to-end variant that:
- Calls `translate.googleapis.com` for both compact (single-word) and phrase translations.
- Normalizes text once and caches results in a process-scoped LRU so repeated selections don't re-fetch.
- Renders one of two popup layouts in the study page: a compact word popup (target word + IPA placeholder + POS placeholder + 1–2 short meanings + Save toggle + Chi tiết) and a sparser phrase popup (translated text + Copy + Save phrase).
- Routes "Chi tiết" to the Studio panel via a server action; if the cache is missing, the action refetches the full provider payload.
- Saves a vocabulary item by upserting on `(userId, normalizedText, targetLanguage, normalizedTranslation)` and appending `VocabularyOccurrence` rows on each save (re-save adds context, never duplicates the headword).
- Drops the `/dictionary` route and the seven DB tables (`translation_caches`, `translation_histories`, `dictionary_*`) that the old path used.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Inline translate uses `translate.googleapis.com/translate_a/single` only, no DB reads or writes on the request path | P1 |
| 2 | In-memory cache keyed by `normalize(text)`; ≤500 entries, 24h TTL; no per-user data stored in cache | P1 |
| 3 | Word popup is compact (≤300px), shows target word + IPA/POS placeholders + 1–2 short meanings + Save toggle + Chi tiết | P1 |
| 4 | Phrase popup shows translated text + Copy + Save phrase (less prominent) | P1 |
| 5 | Studio panel renders full translation when user clicks Chi tiết; server action returns the rich payload | P1 |
| 6 | Save upserts on `(userId, normalizedText, targetLanguage, normalizedTranslation)`, increments `savedCount`, appends `VocabularyOccurrence` | P1 |
| 7 | Save button toggles between "Lưu" and "Đã lưu"; clicking "Đã lưu" removes the row (and its occurrences) | P1 |
| 8 | Inline popup shows a skeleton/spinner immediately on `mouseup`; never waits for the API | P1 |
| 9 | Not-found / network error surfaces "Không tìm thấy bản dịch"; no crash | P1 |
| 10 | Delete `/dictionary` route, `src/features/dictionary/**`, and the seven DB tables | P1 |
| 11 | `pnpm typecheck && pnpm lint && pnpm knip` green | P1 |

## Non-Goals

- Fetching real IPA / POS from Google dictionary endpoint. The DTO has placeholders; fill later.
- Caching across server restarts or across users.
- Switching to OpenAI/DeepL or any AI SDK.
- Adding phrase/compound dictionaries, synonym lists, or any new vocabulary models.
- Touching `VocabularyItem` / `VocabularyOccurrence` / `VocabularySet` schemas — only call sites change.

## Architectural Decision: Route vs Server Action

**Decision: inline translate uses a Route (`POST /api/translate`). No Server Action for translate.**

Rationale (locked):
- The hook today already uses `fetch("/api/translate")` (`use-word-translation.ts:88`). A switch to Server Action is a behavioral + mental-model change with no functional upside.
- Translate is a read-only RPC (no `revalidatePath` needed). Route is the more honest shape for a read.
- Routes are testable via curl/Postman and reachable from non-React clients.
- Save remains a Server Action (`toggleVocabularyItemAction`) because save mutates `VocabularyItem` and the vocabulary page needs `revalidatePath("/vocabulary")`.

Implications:
- The hook keeps using `fetch`. No `translateWordAction` is added.
- The route file is the single owner of the translate endpoint. No second entry point.
- The Studio "Chi tiết" view reads from a tiny client state (also fetched via `fetch` to the same route with a `?full=1` query); no Server Action.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 2 | [Provider + Caching Layer](./phase-02-provider-and-cache.md) | Pending |
| 3 | [Persistence Cleanup + Unsaved Vocabulary](./phase-03-persistence-cleanup-and-toggle-save.md) | Pending |
| 4 | [Dictionary Feature Deletion](./phase-04-dictionary-feature-deletion.md) | Pending |
| 5 | [Popup + Studio Detail Rewrite](./phase-05-popup-and-studio-detail.md) | Pending |

## File Inventory (whole plan)

Conventions:
- **Action**: `rewrite` = open the file, replace contents from scratch reading the original as reference; `modify` = targeted edit; `delete` = remove the file; `create` = new file.
- **Reason**: short justification.
- Phases are ordered for safe execution. Phase 2 must land before Phase 3 (which removes the seven tables the route used to read). Phase 5 depends on the schema in Phase 3.

### Already broken before this plan

| File | Status | Note |
|---|---|---|
| `src/app/api/translate/route.ts` | imports missing `executeTranslate` | The `services/inline-translate.ts` file is gone; the route fails typecheck. Phase 2 owns the rewrite. |

### Phase 2 — Provider + Caching Layer

| Action | Path | Reason |
|---|---|---|
| create | `src/features/reading/server/lib/google-translate.ts` | New provider client. |
| create | `src/features/reading/server/lib/translation-cache.ts` | New LRU (≤500 entries, 24h TTL, key = `normalize(text)`). |
| rewrite | `src/features/reading/server/services/inline-translate.ts` | From scratch. Old implementation joined `translation_caches` and called `lookupQuickDictionaryTranslation`; new implementation is a pure provider call wrapped in cache get/set. |
| rewrite | `src/app/api/translate/route.ts` | From scratch. Old handler imported a missing service; new handler parses Zod, calls `executeTranslate`, and returns `{ translation: null }` on 404 instead of mapping to 404 status. |
| rewrite | `src/features/reading/schemas/translation.ts` | From scratch. Add `TranslationSelection.kind: "word" \| "phrase"`, add `ipa: string \| null` to `TranslationDto`. Drop `provider: "dictionary" \| "ai"` from the literal union (only `cache` / `fallback` / `google_translate` remain; we'll keep only `google_translate` for MVP). |
| delete | `src/features/reading/server/db/inline-translate.ts` | Dead glue from old pipeline; no consumers. |
| delete | `src/features/reading/server/db/translation.ts` | Dead glue from old pipeline; no consumers. |
| modify | `src/features/reading/lib/text-utils.ts` | Keep only `countWords` (used by `selection-utils.ts`); drop the orphan `TranslateResolutionSource` type. |
| modify | `src/features/reading/lib/selection-utils.ts` | Add `kind: "word" \| "phrase"` to the returned `TranslationSelection`. The `countWords` import still resolves through `text-utils.ts`. |

### Phase 3 — Persistence Cleanup + Unsaved Vocabulary

| Action | Path | Reason |
|---|---|---|
| rewrite | `prisma/schema.prisma` | From scratch. Drop the seven models, drop `VocabularySourceType.DICTIONARY`, drop `dictionaryEntryId` / `dictionarySenseId` columns on `VocabularyItem`. Keep `VocabularyItem`, `VocabularyOccurrence`, `VocabularySet`, `VocabularySetItem`, passage models, `User*`. |
| modify | `package.json` | Drop `db:seed:dictionary` script if still present. |
| create | `prisma/migrations/<timestamp>_drop_dictionary_and_translation_tables/migration.sql` | One migration drops the seven tables and the two optional columns. |
| rewrite | `src/features/vocabulary/schemas/vocabulary.ts` | From scratch. Remove `dictionaryEntryId` / `dictionarySenseId` from `saveVocabularyInputSchema`. Keep DTOs and mappers untouched. |
| rewrite | `src/features/vocabulary/server/services/vocabulary-items.ts` | From scratch. Remove `dictionaryEntryId` / `dictionarySenseId` from `SaveVocabularyItemInput`. Keep the upsert + occurrence creation logic identical. |
| modify | `src/features/vocabulary/server/db/vocabulary-items.ts` | Drop `dictionaryEntryId` / `dictionarySenseId` from `UpsertVocabularyItemParams` and the `create` payload. |
| modify | `src/features/vocabulary/server/actions/vocabulary.ts` | Add `toggleVocabularyItemAction`; keep `saveVocabularyAction` (used by callers that don't want toggle). |
| delete | `prisma/seed.ts` | No consumers after the dictionary removal. |
| delete | `prisma/data/dictionary/**` | Seed JSON for the dropped tables. |

### Phase 4 — Dictionary Feature Deletion

| Action | Path | Reason |
|---|---|---|
| delete | `src/app/(dashboard)/dictionary/**` | Already deleted by user; remove if a stray file remains. |
| delete | `src/features/dictionary/**` | Already deleted by user; remove if a stray file remains. |
| modify | navigation/rail component | Remove the "Từ điển" entry and any unused `Languages` icon import. |

### Phase 5 — Popup + Studio Detail Rewrite

| Action | Path | Reason |
|---|---|---|
| rewrite | `src/features/reading/components/translation-popup.tsx` | From scratch. Old component rendered one layout with text-style POS chip; new component branches on `selection.kind` (word vs phrase), exposes Save toggle + Chi tiết. |
| create | `src/features/reading/components/translation-detail-card.tsx` | Studio panel render for full payload. |
| create | `src/features/reading/hooks/use-full-translation.ts` | Server action wrapper hook for "Chi tiết". |
| create | `src/features/reading/hooks/use-translation-selection.ts` | Decides word vs phrase from `selectedText`. |
| create | `src/features/reading/server/actions/full-translation.ts` | New server action wrapping `getFullTranslation`. |
| create | `src/features/reading/server/services/full-translation.ts` | Service that returns either word payload (meanings) or phrase payload. |
| rewrite | `src/features/reading/hooks/use-word-translation.ts` | From scratch. Expose `selectionKind`; remove `clientMetrics` from outgoing request payload (the dict endpoint is gone). |
| rewrite | `src/features/reading/hooks/use-store-vocabulary.ts` | From scratch. Call `toggleVocabularyItemAction`; expose `{ saved, toggleSave }`. |
| rewrite | `src/features/reading/hooks/use-content-state.ts` | From scratch. Surface the new fields from `useWordTranslator` + `useVocabulary` to the consumer. |
| rewrite | `src/features/reading/components/content-panel.tsx` | From scratch. Render the Studio Translation tab; pass the new `selection` / `toggleSave` props to `TranslationPopup`. |
| modify | `src/features/reading/lib/selection-utils.ts` | Add `kind` to the returned selection. (Phase 2 already touched this file; Phase 5 reconfirms.) |

## Success Criteria

- [ ] `POST /api/translate` returns `{ translation, type: null, provider: "google_translate" }`; hits `translate.googleapis.com` directly; cache populated on first call.
- [ ] Same word selected twice in the same session: second call returns from cache, no second network request.
- [ ] Word popup renders 250–300px wide, has Save toggle + Chi tiết; phrase popup has Copy + Save phrase.
- [ ] Clicking Chi tiết renders the full payload in the Studio panel (no cache miss when clicked after the inline view).
- [ ] Saving the same headword twice creates one `VocabularyItem` row with `savedCount=2` and two `VocabularyOccurrence` rows.
- [ ] "Đã lưu" toggle deletes the headword and its occurrences.
- [ ] `/dictionary` returns 404; the seven tables are dropped.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` all green.

## Risks

- **Provider contract drift** — `translate.googleapis.com` is undocumented and may change. Wrap parsing in a try/catch that returns `null` translation; the popup renders the "Not found" state.
- **Cache staleness** — since the provider speaks English↔Vietnamese only and the response is deterministic per `normalize(text)`, 24h TTL is safe. No invalidation needed.
- **Studio ownership** — currently the Studio panel is a fixed artifact list per passage. The detail view slots in as a new "Translation" tab without breaking the existing artifact list (additive layout).
- **Save toggle delete** — `deleteVocabularyItemById` already exists; reusing it deletes the headword and cascades occurrences through the existing FK.

## Schema cache double-relation note

The current `prisma/schema.prisma` shows that `translation_caches` and `translation_histories` each have a relation array from **both** `passages` and `profiles`. This is FK-level redundancy, not caching redundancy — neither array serves a query today. Confirmed by grep: the only consumer of `translation_caches` is `src/features/reading/server/db/inline-translate.ts:31`, which is deleted in Phase 2.

Phase 3 must remove, in one migration:
- the two `model … {}` blocks,
- the `translation_caches translation_caches[]` and `translation_histories translation_histories[]` lines on `passages`,
- the same two lines on `profiles`.

After this:
- `passages` retains its single FK to user (`profiles`), `studio_artifacts`, `questions`, `study_chat_messages`, `upload_jobs` (passages don't reference upload_jobs directly today — leave that as-is).
- `profiles` retains its single FK to `user`.
- No translation-related array on either model.

The plan does not reintroduce a per-passage or per-user cache table. Future cache needs should use the in-process LRU (Phase 2).

<!-- slug: simplify-translate-dictionary -->