# Vocabulary Page

## Route

Route:

`/[locale]/vocabulary`

Route file:

`src/app/[locale]/(dashboard)/vocabulary/page.tsx`

Root client:

`src/features/vocabulary/ui/vocabulary-page-client.tsx`

## Purpose

Authenticated vocabulary management page for saved words and vocabulary sets.

## Rendering Boundary

- Server page is `force-dynamic`.
- Server page authenticates with `getAuthenticatedUser`.
- `VocabularyPageClient` owns tab state, filters, pagination, and mutation handlers.

## Layout

```text
VocabularyPageClient
+-- Page title and description
+-- Segmented tab control
|   +-- Words
|   +-- Sets
+-- Words tab
|   +-- VocabularyList
+-- Sets tab
    +-- VocabularySetList
```

The page is centered with `max-w-3xl`, compact vertical spacing, and extra desktop top padding to clear the dashboard top bar.

## State And Data

Client state:

- `page`
- `search`
- `statusFilter`
- `activeTab`
- `creating`

Data hooks:

- `useVocabularyList(page, statusFilter, search)`
- `useVocabularySets(activeTab === "sets")`

Mutations:

- Patch word status through `/api/vocabulary/:id/status`.
- Delete word through `/api/vocabulary/:id`.
- Create set through `/api/vocabulary/sets`.
- Delete set through `/api/vocabulary/sets/:id`.

## UI States

- Words error renders `PageErrorState`.
- Sets error renders `PageErrorState`.
- Words tab renders `VocabularyList`.
- Sets tab renders `VocabularySetList`.
- Tab buttons use icons and compact text.

## UI Rules

- Keep words and sets in the same page; do not split them into separate routes without updating this doc and navigation.
- Filters, search, pagination, and item rows belong inside `VocabularyList`.
- Set creation and set rows belong inside `VocabularySetList`.
- Keep mutation failures non-destructive to the current visible state unless a richer error surface is added.
