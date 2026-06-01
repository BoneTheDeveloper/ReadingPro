---
phase: 4
title: "Dictionary Search UI"
status: pending
priority: P1
effort: "3h"
dependencies:
  - 1
  - 2
  - 3
---

# Phase 4: Dictionary Search UI

## Overview

Update `/dictionary` search and result rendering to use the new DTOs, deterministic suggest behavior, and backend-managed source labels.

## Requirements

- Functional: Client does not fetch suggestions when normalized query length is `< 2`.
- Functional: Server returns `{ success: true, data: [] }` for normalized suggest query length `< 2`.
- Functional: Suggest returns bounded local-only DTOs with `matchType`, `matchedAlias`, `primaryTranslation`, and `sourceLabel`.
- Functional: UI renders backend `sourceLabel` and does not own source-label mapping rules.
- Functional: Client ignores stale responses, clears safely, and caches identical normalized suggest queries in session.
- Non-functional: Client components consume shared DTO types, not generated Prisma dictionary model types.

## Architecture

Server owns normalization, short-query behavior, ranking, status filtering, and source-label mapping. `DictionaryPageClient` owns debounce, abort/request id guard, clear behavior, and session cache. Result cards render server-provided senses in order.

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/src/app/api/dictionary/suggest/route.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/dictionary-dtos.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/features/dictionary/dictionary-page-client.tsx`
- Modify: `/home/luc/Project/english-reading-training-app/src/features/dictionary/dictionary-suggest-dropdown.tsx`
- Modify: `/home/luc/Project/english-reading-training-app/src/features/dictionary/dictionary-entry-card.tsx`
- Modify: `/home/luc/Project/english-reading-training-app/localization/messages/en.json`
- Modify: `/home/luc/Project/english-reading-training-app/localization/messages/vi.json`

## Implementation Steps

1. Update suggest route normalization and `< 2` short-circuit.
2. Update suggest DTO/ranking to include alias match metadata and backend `sourceLabel`.
3. Remove client imports of generated Prisma dictionary types.
4. Add stale-response protection and normalized-query session cache.
5. Update dropdown/card rendering for multi-sense results, miss copy, and source labels.

## Success Criteria

- [ ] Normalized suggest queries shorter than 2 characters return empty success data and avoid client fetch.
- [ ] Exact matches rank before aliases, aliases before prefix/phrase results.
- [ ] Older responses cannot overwrite newer suggestions or cleared input.
- [ ] Result cards render multiple senses in server order and show backend `sourceLabel`.
- [ ] Dictionary UI consumes DTO types only.

## Risk Assessment

Ranking can become overcomplicated. Prefer indexed candidate fetch plus deterministic in-memory ordering unless performance proves otherwise.
