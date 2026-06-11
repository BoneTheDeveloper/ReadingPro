# Dictionary Page

## Route

Route:

`/[locale]/dictionary`

Route file:

`src/app/[locale]/(dashboard)/dictionary/page.tsx`

Root client:

`src/features/dictionary/dictionary-page-client.tsx`

## Purpose

Authenticated dictionary lookup page for English to Vietnamese study support. Users search for a term, select a suggestion, inspect a dictionary entry, and save senses to vocabulary.

## Rendering Boundary

- Server page is `force-dynamic`.
- Server page authenticates with `getAuthenticatedUser`.
- `DictionaryPageClient` owns query state, suggestion fetching, entry detail fetching, cache, and save interactions.

## Layout

```text
DictionaryPageClient
+-- Page header
+-- Search input
|   +-- DictionarySuggestDropdown
+-- Scrollable detail region
    +-- Loading
    +-- DictionaryEntryCard
    +-- Not found
    +-- Error
    +-- Idle hint
```

The page is centered with `max-w-2xl`, vertical spacing, and a compact dictionary header.

## Interaction Contract

- Suggestions debounce at 250ms.
- Suggestions require normalized query length of at least 2.
- Suggest results are cached in browser memory by normalized term.
- Suggest API: `/api/dictionary/suggest`.
- Entry detail API: `/api/dictionary/entries/:entryId`.
- API responses are parsed with shared dictionary Zod schemas.
- Saving vocabulary is delegated to `useSaveDictionaryVocabulary`.

## UI Rules

- Search remains the primary visual focus.
- The suggestion dropdown belongs directly under the input.
- Detail results should scroll inside the page content area.
- Preserve explicit idle, loading, not-found, and error states.
- Entry cards own the dense lexical rendering; the page shell should stay simple.
