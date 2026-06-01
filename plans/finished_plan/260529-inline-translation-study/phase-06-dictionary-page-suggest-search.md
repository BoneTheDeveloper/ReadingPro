---
phase: 6
title: "Dictionary Page with Suggest Search"
status: completed
priority: P2
effort: "3h"
dependencies: [2]
---

# Phase 6: Dictionary Page with Suggest Search

## Overview

Add a dedicated `/dictionary` page where learners search English words using a debounced suggest dropdown. Selecting a suggestion loads the full entry detail. This provides a way to browse and verify the seeded dictionary content.

## Decisions

- V1 uses exact + prefix match (`startsWith` on `normalizedTerm`). Postgres FTS + pg_trgm + custom ranking deferred to later.
- Suggest dropdown appears after 250ms debounce, returns top 8 prefix-matched results.
- Clicking a suggestion fetches the full entry via `/api/dictionary` exact match.
- No button-based search — the input is type-ahead only.

## Architecture

### Data flow

```
User types → debounce 250ms → GET /api/dictionary/suggest?q=...
  → suggestDictionaryEntries (prefix match, top 8)
  → dropdown renders suggestions
  → user clicks suggestion
  → GET /api/dictionary?q=term (exact match)
  → full DictionaryEntryCard rendered
```

### API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dictionary` | GET | Exact match lookup, returns full entry |
| `/api/dictionary/suggest` | GET | Prefix match, returns top 8 (id, term, translation, type) |

### DB queries

| Function | Location | Purpose |
|----------|----------|---------|
| `searchDictionaryExact()` | `dictionary-queries.ts` | Exact normalizedTerm match |
| `suggestDictionaryEntries()` | `dictionary-queries.ts` | `startsWith` prefix match, limited select |
| `listDictionaryEntries()` | `dictionary-queries.ts` | Paginated browse (unused in UI yet) |

## Related Code Files

- Create: `src/lib/db/dictionary-queries.ts`
- Create: `src/app/api/dictionary/route.ts`
- Create: `src/app/api/dictionary/suggest/route.ts`
- Create: `src/features/dictionary/dictionary-page-client.tsx`
- Create: `src/features/dictionary/dictionary-entry-card.tsx`
- Create: `src/features/dictionary/dictionary-suggest-dropdown.tsx`
- Create: `src/app/[locale]/(dashboard)/dictionary/page.tsx`
- Modify: `src/components/layout/dashboard-sidebar.tsx` (added nav item)
- Modify: `localization/messages/en.json`, `localization/messages/vi.json` (Dictionary section)

## Success Criteria

- [x] `/dictionary` page loads with search input
- [x] Typing triggers debounced suggest dropdown with prefix-matched results
- [x] Clicking a suggestion loads full entry detail (translation, type, pronunciation, meanings, examples, related words)
- [x] No-match shows empty state
- [x] Sidebar shows Dictionary icon with active state
- [x] Both API endpoints require authentication
- [x] Sentry spans on auth + DB queries
- [x] Typecheck passes

## Incoming Tasks After This Phase

- Upgrade to Postgres FTS + pg_trgm with custom ranking for fuzzy/typo-tolerant search
- Add browse/paginated view for all dictionary entries
- Add vocabulary integration (save from dictionary page, show if already saved)
