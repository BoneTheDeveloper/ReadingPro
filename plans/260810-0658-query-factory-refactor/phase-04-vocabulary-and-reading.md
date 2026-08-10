---
title: "Phase 4: Vocabulary and Reading"
status: complete
priority: P2
dependencies: [2]
---

# Phase 4: Vocabulary and Reading

## Overview

The two small features. Neither needs a `queryOptions` factory — this phase is mostly deletion,
which is the correct outcome and should not be inflated into a conversion.

- **Vocabulary** has a query module that nothing imports. Delete it.
- **Reading** has one mutation wrapped in a redundant `useState` mirror. Collapse it.

## Requirements

- Functional: no behavior change visible to the user.
- Non-functional: dead vocabulary query code removed; `useTranslation`'s duplicated state removed.
- Non-functional: `vocabulary/api/query-keys.ts` deleted.

## Architecture

### Vocabulary: delete, do not convert

`useVocabularyItems` has **zero consumers**. `/vocabulary` is a server component that calls
`listVocabularyItemsForUser` directly and passes `initialList` as props, with
`export const dynamic = "force-dynamic"` — so it refetches on every navigation. There is no
client read to convert.

Deleting is right, not lazy: converting dead code to a new pattern preserves the illusion that
something depends on it. When a client-side vocabulary read is actually needed, re-add it from
the Phase 2 factory template in one sitting.

Consequence worth stating: `useCreateVocabularyMutation` needs **no** cache invalidation. The
`force-dynamic` RSC read already returns fresh data after a save. Do not add an invalidate for
a cache that does not exist.

`useCreateVocabularyMutation` also parses its *input* with `VocabularyInputSchema.parse` before
sending — duplicating the route's own parse. Keep it only if the fail-fast client-side UX is
wanted; otherwise drop it and let the route be the single validator. Record the choice.

### Reading: the `useState` mirror is pure duplication

[api/mutations.ts:25](../../src/features/reading/api/mutations.ts:25) mirrors `mutation.data` and
`mutation.error` into local `useState`, then exposes `translate()`/`reset()`. Every piece of that
already exists on the mutation object:

| Wrapper exposes | `useMutation` already returns |
|---|---|
| `data` (useState) | `mutation.data` — persists until `reset()` or the next `mutate()` |
| `error` (useState) | `mutation.error` |
| `isPending` | `mutation.isPending` |
| `translate(word, ctx)` | `mutation.mutate({ word, context })` |
| `reset()` | `mutation.reset()` |

`content-panel.tsx:26` destructures exactly those five, so the collapse is mechanical.

`TranslateInputSchema` gives `sourceLanguage`/`targetLanguage` `.default()` values, so the client
does not need to send them — the route fills them in. The `mutationFn` takes `{ word, context }`.

```ts
// src/features/reading/api/mutations.ts
export function useTranslateMutation() {
  return useMutation({
    mutationKey: ["translate"] as const,
    mutationFn: (input: { word: string; context: string }) =>
      fetchJson("/api/translate", TranslationOutputSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}
```

The hook stays in `api/mutations.ts` — it is pure transport with no client state left. Nothing
moves to `reading/hook/`; that folder keeps `use-scroll-progress.ts` only. This supersedes the
wrapper introduced by `plans/260802-1622-translation-react-query/`.

## Related Code Files

- Delete: `src/features/vocabulary/api/queries.ts`
- Delete: `src/features/vocabulary/api/query-keys.ts`
- Modify: `src/features/vocabulary/api/mutations.ts` (fetchJson; decide on the input pre-parse)
- Modify: `src/features/reading/api/mutations.ts` (collapse to `useTranslateMutation`)
- Modify: `src/features/reading/component/content-panel.tsx`

## Implementation Steps

1. Run `pnpm knip` and confirm it flags `useVocabularyItems`/`vocabularyKeys` as unused before
   deleting — evidence, not assumption.
2. Delete `vocabulary/api/queries.ts` and `vocabulary/api/query-keys.ts`.
3. Update `vocabulary/api/mutations.ts`: route through `fetchJson`. `POST /api/vocabulary`
   returns the created item at 201 — add a response schema or, if the response is unused, keep
   it minimal. Resolve the input pre-parse question and comment the decision.
4. Rewrite `reading/api/mutations.ts` as `useTranslateMutation` per the sketch; delete the
   `useState` mirror, the `useCallback` wrappers, and the `useTranslation` export.
5. Update `content-panel.tsx`: `const translation = useTranslateMutation()`, then
   `translation.data` / `.error` / `.isPending` / `.mutate({ word, context })` / `.reset()`
   at the five existing call sites (lines ~26, 35, 37, 49, 61, 64-66, 70-76, 182-190).
6. Run `pnpm typecheck && pnpm lint && pnpm knip`.

## Todo

- [x] `knip` confirms vocabulary query code is dead, then it is deleted
- [x] `vocabulary/api/mutations.ts` uses `fetchJson`; input-parse decision recorded in a comment
- [x] `useTranslation` collapsed to `useTranslateMutation`; state mirror gone
- [x] `content-panel.tsx` updated
- [x] `pnpm typecheck && pnpm lint && pnpm knip` pass
- [x] Manual smoke passed

## Success Criteria

- [x] `src/features/vocabulary/api/` contains only `mutations.ts`
- [x] No `useState` remains in any `api/` module across the codebase
- [x] Manual: select a word in the reading panel → translation popup shows pending → result
      renders → "Lưu" saves → navigate to `/vocabulary` → the word is listed
- [x] Manual: select a second word without closing the popup → the previous result is replaced,
      not stacked (confirms `reset()`/`mutate()` semantics match the old wrapper)

## Risk Assessment

- **Deleting vocabulary queries could conflict with in-flight work on the vocabulary page.**
  `VocabularyPageClient` receives `initialStats`/`initialSets` props that are currently stubbed
  (`{ total: 0, ... }`, `[]`), suggesting a planned expansion. Deletion does not block that —
  a future client read gets the factory shape from day one instead of inheriting this dead module.
- **Popup behavior on rapid re-selection.** The old wrapper cleared state via `reset()` in three
  places; the collapse must preserve each of those call sites. Covered by the second manual check.
- **`content-panel.tsx` has the most call sites of any file in this plan.** Change them in one
  pass and let typecheck find stragglers.
