---
title: "Phase 1: Toggle Action + Hook"
phase: 1
status: pending
priority: P1
effort: 4h
dependencies: []
---

# Phase 1: Toggle Action + Hook

## Overview

Implement `toggleVocabularyItemAction` (upsert or delete based on the unique key) and rewrite `useStoreVocabulary` to drive the popup button. The button text toggles `Lưu` ↔ `Đã lưu` and the action revalidates `/vocabulary` on success.

## Requirements

- Functional
  - First click on `Lưu` creates a `VocabularyItem` row + a `VocabularyOccurrence` row.
  - Second click on the same selection deletes the row (and its occurrences through FK cascade).
  - Same headword saved twice with two different contexts → one row, two occurrences.
  - The vocabulary page reflects the change without manual refresh.
- Non-functional
  - `pnpm typecheck && pnpm lint && pnpm knip` green.

## Architecture

```
Popup button click
   │
   ▼
useStoreVocabulary.toggleSave()
   │  validate translation non-null
   ▼
toggleVocabularyItemAction(input)
   │  auth check (existing pattern)
   │  findFirst by unique key (userId, normalizedText, targetLanguage, normalizedTranslation)
   ├── exists → deleteVocabularyItemById
   │           revalidatePath("/vocabulary")
   │           return { saved: false, vocabularyItemId: null }
   └── not exists → saveVocabularyItem
                     revalidatePath("/vocabulary")
                     return { saved: true, vocabularyItemId: result.id }
   │
   ▼
Hook updates savedKeys Set (per selection tuple)
   │
   ▼
Popup re-renders with new button text
```

## Related Code Files

Refer to top-level **File Inventory** in `plan.md`.

This phase owns:
- modify: `src/features/vocabulary/server/actions/vocabulary.ts`
- rewrite: `src/features/reading/hooks/use-store-vocabulary.ts`

## Implementation Steps

1. Add `toggleVocabularyItemAction` in `src/features/vocabulary/server/actions/vocabulary.ts`:
   ```ts
   export async function toggleVocabularyItemAction(input: z.infer<typeof toggleVocabularyInputSchema>) {
     const parsed = toggleVocabularyInputSchema.parse(input);
     const session = await auth.api.getSession({ headers: await headers() });
     if (!session) throw new Error("Authentication required");

     const normalized = parsed.selectedText.toLowerCase().trim().replace(/\s+/g, " ");
     const normalizedTranslation = parsed.translation.toLowerCase().trim().replace(/\s+/g, " ");

     const existing = await prisma.vocabularyItem.findFirst({
       where: {
         userId: session.user.id,
         normalizedText: normalized,
         targetLanguage: parsed.targetLanguage,
         normalizedTranslation,
       },
       select: { id: true },
     });

     if (existing) {
       await deleteVocabularyItemById({ userId: session.user.id, itemId: existing.id });
       revalidatePath("/vocabulary");
       return { saved: false, vocabularyItemId: null };
     }

     const result = await saveVocabularyItem({ ...parsed, userId: session.user.id });
     revalidatePath("/vocabulary");
     return { saved: true, vocabularyItemId: result.id };
   }
   ```
   Add `toggleVocabularyInputSchema` (mirror of `saveVocabularyInputSchema` but without dictionary fields — reuse the trimmed-down schema the simplify-translate plan ships in Phase 5).
2. Rewrite `src/features/reading/hooks/use-store-vocabulary.ts`:
   ```ts
   export function useVocabulary(selectedWordInfo, translationData) {
     const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
     const [transitioning, setTransitioning] = useState(false);
     const key = vocabularyKey(selectedWordInfo);

     const toggleSave = useCallback(async () => {
       if (!selectedWordInfo || !translationData?.translation || transitioning) return;
       setTransitioning(true);
       try {
         const result = await toggleVocabularyItemAction({ … });
         setSavedKeys(prev => {
           const next = new Set(prev);
           if (result.saved) next.add(key);
           else next.delete(key);
           return next;
         });
       } finally {
         setTransitioning(false);
       }
     }, [selectedWordInfo, translationData, key, transitioning]);

     const saved = key ? savedKeys.has(key) : false;
     return { saved, toggleSave, isVocabularySaved: saved, handleSaveVocabulary: toggleSave };
   }
   ```
3. Run `pnpm typecheck && pnpm lint`.

## Success Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm knip` green.
- [ ] Selecting a known word in the popup, clicking `Lưu`, then re-selecting the same word shows `Đã lưu`.
- [ ] Clicking `Đã lưu` removes the row; re-selecting shows `Lưu` again.
- [ ] `/vocabulary` page reflects the change after the action.

## Risk Assessment

- The simplify-translate plan Phase 5 must have shipped before the unique constraint exists in this exact shape (translation is part of the unique key). If cooked out of order, the unique index in this plan won't have `normalizedTranslation` and the upsert/del lookup will match multiple rows.
- `transitioning` is a local flag only; not server-enforced. Concurrent calls from different tabs would still race the action.

## Security Considerations

- Action reuses `auth.api.getSession`; no public surface.
- Zod schema stays `.strict()`; no `dictionaryEntryId` / `dictionarySenseId` accepted (these are dropped by simplify-translate Phase 5).

## Open Questions

- Should the action reject save when `translation === null`? The hook already prevents the click, but server-side defense in depth would call `parsed.translation.trim().length > 0`.
- Should the savedKeys Set be hydrated from the server on mount so that refreshing the study page correctly shows `Đã lưu`? Current implementation is purely client-side. If needed, the action returns the saved key set on toggle, and the hook can merge it.