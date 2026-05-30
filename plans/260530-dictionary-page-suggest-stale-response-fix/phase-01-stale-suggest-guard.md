---
phase: 1
title: "Stale Suggest Guard"
status: pending
priority: P2
effort: "2h"
dependencies: []
---

# Phase 1: Stale Suggest Guard

## Overview

Guard the Dictionary page suggest-search flow so only the latest active query can update suggestions.

## Main Info

- Problem: `DictionaryPageClient` applies every suggest response unconditionally, so an older slower response can overwrite newer query results or repopulate the dropdown after clear.
- Resolve: Add request invalidation via `AbortController`, request id, or both; only apply `json.data` when it belongs to the current trimmed query.

## Requirements

- Functional: Suggestions update only for the latest active non-empty query.
- Functional: Clearing the input clears suggestions, hides dropdown, and invalidates in-flight fetches.
- Functional: Aborted/stale requests must not leave loading stuck.
- Non-functional: Preserve the existing debounce timing and endpoint contract.

## Architecture

Keep the fix inside `DictionaryPageClient`. A simple implementation is:

- Keep `requestIdRef` and increment it for each query/clear.
- Optionally keep an `AbortController` for current fetch and abort it in cleanup or on clear.
- Before applying response data, check both current request id and current trimmed query.

## Related Code Files

- Modify: `src/features/dictionary/dictionary-page-client.tsx`
- Read: `src/features/dictionary/dictionary-suggest-dropdown.tsx`

## Implementation Steps

1. Add request invalidation state to `DictionaryPageClient`.
2. In clear-input path, clear suggestions, hide dropdown, stop loading, and invalidate/abort pending requests.
3. In debounced fetch, capture request id and query before starting fetch.
4. Apply suggestions only if the response still matches the latest request and active query.
5. Ensure `finally` only clears loading for the latest active request.

## Success Criteria

- [ ] Older responses cannot overwrite current suggestions.
- [ ] Cleared input cannot be repopulated by stale results.
- [ ] Loading state is correct after success, error, abort, and stale response.

## Risk Assessment

Risk is low. The main risk is hiding valid suggestions because request guards are too strict. Keep the active-query comparison exact to the trimmed query used for the request.
