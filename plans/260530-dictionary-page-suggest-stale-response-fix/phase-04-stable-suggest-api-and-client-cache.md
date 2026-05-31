---
phase: 4
title: "Stable Suggest API and Client Cache"
status: pending
priority: P1
effort: "3h"
dependencies:
  - 1
---

# Phase 4: Stable Suggest API and Client Cache

## Overview

Make dictionary word search suggestions fast, deterministic, local-only, alias-aware, stale-response safe, and efficient for repeated identical queries.

## Requirements

- Functional: Normalize suggest query text before search.
- Functional: Empty and too-short queries clear suggestions without hitting the API.
- Functional: Suggest endpoint reads local DB only; no provider call while typing.
- Functional: Return only small dropdown fields: display term, normalized term, primary translation, type, frequency rank, confidence, and source metadata if needed.
- Functional: Limit result size to 8-10 entries.
- Functional: Rank exact normalized term first, then exact alias, then phrase/prefix matches, then lower frequency rank, then higher confidence.
- Functional: Client ignores stale responses, clears safely, and caches identical normalized query results for the current session.
- Non-functional: Suggest responses are deterministic for the same seed/cache state.

## Architecture

Keep server suggest behavior in `suggestDictionaryEntries()` and `/api/dictionary/suggest`. Server owns normalization, minimum length, bounded DTO fields, alias-aware lookup, and stable ranking. `DictionaryPageClient` owns debounce, AbortController/request id guard, clear-input invalidation, and an in-memory `Map` keyed by normalized query for same-session duplicate reuse.

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/src/app/api/dictionary/suggest/route.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/features/dictionary/dictionary-page-client.tsx`
- Modify: `/home/luc/Project/english-reading-training-app/src/features/dictionary/dictionary-suggest-dropdown.tsx`
- Read: `/home/luc/Project/english-reading-training-app/docs/testing/vitest-infrastructure.md`

## Implementation Steps

1. Update suggest validation to accept raw text, normalize server-side, and return an empty success payload for empty/too-short normalized queries if the client somehow calls it.
2. Update `suggestDictionaryEntries()` to select bounded DTO fields and implement deterministic ordering: exact term first, exact alias second, prefix/phrase matches next, then `frequencyRank`, confidence/source tie-breakers, then normalized term.
3. Add route logging/Sentry attributes for query length, normalized length, result count, and cache/provider flags without raw query text.
4. Add client-side normalized-query helper matching server normalization.
5. Add request invalidation with request id and/or `AbortController`; stale responses and stale `finally` blocks must not update suggestions/loading.
6. Add session `Map` cache for identical normalized suggest queries and reuse cached results without duplicate fetches.
7. On clear or too-short input, hide dropdown, clear suggestions, stop loading, abort current fetch, and invalidate pending request ids.

## Success Criteria

- [ ] Suggest API returns deterministic local-only results with exact match first.
- [ ] Suggest API resolves exact aliases without duplicate canonical entries.
- [ ] Suggest API returns bounded DTO fields and bounded result count.
- [ ] Empty/too-short query does not trigger client fetch and is safe on server.
- [ ] Older slower responses cannot overwrite newer suggestions.
- [ ] Clearing input cannot be repopulated by in-flight responses.
- [ ] Repeating the same normalized query during one session reuses client cache.

## Risk Assessment

Ranking can become database-specific if implemented with raw SQL too early. Prefer simple Prisma queries plus stable in-memory ordering for the small page size unless query plans prove that PostgreSQL ordering must do more work.
