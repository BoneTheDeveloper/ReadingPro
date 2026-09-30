---
phase: 2
title: "Phase 2: Save context and translation cache"
status: completed
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Save context and translation cache

## Overview

Deliver US-11 (save a word with its first sentence and passage, normalized
identity) and the US-10 session cache (the same word in the same sentence is not
translated twice in one session).

## Context Links

- [EP-04](../../docs/Requirements/epic-04-vocabulary-capture.md), US-10 and US-11
- `src/client/features/reading/components/content-panel.tsx` (`handleSaveVocabulary`, `handleTranslateClick`)
- `src/client/features/reading/lib/word-selection.ts` (`context` is the sentence from `extractSentence`)
- `src/client/features/reading/api/mutations.ts` (`useTranslateMutation`)

## Requirements

- [x] `term` and `translation` are trimmed, whitespace-collapsed, and lowercased before storage, on create and on edit.
- [x] A new word stores `contextSentence` and `passageId`; a duplicate save increments `savedCount` and leaves both untouched.
- [x] `passageId` is accepted only when the passage belongs to the caller.
- [x] A repeated translation request for the same `[word, context]` in one session is served from the client cache.
- [x] Translations are not written to the database.

## Related Code Files

- Modify: `src/shared/vocabulary/schema.ts`
- Modify: `src/server/modules/vocabulary/vocabulary-crud.ts`
- Modify: `src/client/features/reading/components/content-panel.tsx`
- Modify: `src/client/features/reading/api/mutations.ts` (or move to `api/queries.ts`), `src/client/features/reading/index.ts` if it re-exports the hook

## Implementation Steps

1. **Normalization.** In `src/shared/vocabulary/schema.ts` add one helper,
   `normalizeVocabularyText = (s) => s.trim().replace(/\s+/g, " ").toLowerCase()`,
   and apply it with `.transform()` to `term` and `translation` in both
   `VocabularyInputSchema` and `VocabularyUpdateInputSchema`. Keep the length
   limits before the transform.
2. **Input.** Add to `VocabularyInputSchema`:
   `contextSentence: z.string().trim().min(1).max(1000).optional()` and
   `passageId: z.string().uuid().optional()`. The 1000 limit matches
   `TranslateInputSchema.context`.
3. **Store** (`storeVocabularyItemForUser`):
   - If `passageId` is present, check `prisma.passage.findFirst({ where: { id, userId } })`;
     throw `AppError("passage.not_found", ...)` when it is not the caller's.
   - In the upsert, put `contextSentence` and `passageId` in `create` only. The
     `update` branch keeps `savedCount: { increment: 1 }` and `partofSpeech`.
4. **Update** (`updateVocabularyItemForUser`): editing `term` or `translation` to a
   pair that already exists hits the unique constraint. Catch Prisma `P2002` and
   throw a new reason `vocabulary.duplicate` (409, `CONFLICT`); add it to
   `src/shared/api-error.ts` and a Vietnamese string to
   `src/client/lib/api/error-message.ts`.
5. **Reader save.** In `content-panel.tsx` `handleSaveVocabulary`, send
   `contextSentence: wordAnchor.context` and `passageId: passage.id`.
   The manual "add word" dialog on `/vocabulary` sends neither.
6. **Session cache.** Replace `useTranslateMutation` with a query:
   `queryKey: ["translate", word, context]`, `staleTime: Infinity`,
   `gcTime: Infinity`, `enabled: false`, `meta: { silent: true }`, same `fetchJson`
   call. `content-panel.tsx` keeps its explicit "translate" click: call
   `queryClient.fetchQuery(...)` (or `refetch` guarded by cached data) so a cache
   hit returns without a network request. Replace `translation.reset()` with
   clearing the selected key in component state; replace `translation.data`,
   `isPending`, and `error` reads with the query's fields. The cache lives in the
   in-memory query client, so it ends with the browser session.

## Todo

- [x] Normalization helper applied to both schemas
- [x] Context fields accepted and stored on create only
- [x] Passage ownership check
- [x] Duplicate-on-edit mapped to a 409 reason
- [x] Reader sends sentence and passage
- [x] Translation served from the session cache
- [x] Verification passed

## Success Criteria

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `POST /api/vocabulary` twice with `"term":"Run","translation":"Chạy"` then
  `"term":"run","translation":"chạy"` and a different `contextSentence` yields one
  row with `savedCount` 2 and the first sentence.
- `"translation":"chạy bộ"` creates a second row.
- `POST /api/vocabulary` with another user's `passageId` answers 404.
- In the browser network tab, translating the same word in the same sentence
  twice sends one `/api/translate` request; after a reload it sends one again.
- Translation errors still render inline in the popup and raise no toast.

## Risk Assessment

- **Lowercasing proper nouns** ("Paris" becomes "paris"). Accepted by the design;
  the list can capitalize for display later if wanted.
- **Popup behavior drift** when moving from mutation to query. Check loading,
  error, reselect, and save-button states by hand.
- **Rollback:** revert the commit; no schema change in this phase.

## Security Considerations

`passageId` from the client is untrusted; the ownership check prevents linking a
word to another user's passage and later leaking its title on the review card.

## Next Steps

Phase 5 shows `contextSentence` and the passage link on the back of the card.
