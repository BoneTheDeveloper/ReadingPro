---
phase: 1
title: "Fetch passages on mount"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Fetch passages on mount

## Overview

The study page never loads persisted passages from the database on mount. `getUserPassages()` exists in `passage-queries.ts` but has zero callers. Fix by creating a server action and calling it from `StudyPageClient` on mount.

## Requirements

- Functional: On page load, fetch all passages for the authenticated user from DB and populate state
- Non-functional: Minimal changes, no new API routes needed

## Architecture

```
StudyPageClient (useEffect on mount)
  → studyFetchPassagesAction (new server action)
    → getUserPassages(userId) (existing query)
    → map DB rows → PassageData[] (client type)
  → setState({ passages })
```

## Related Code Files

- Create: `src/app/actions/study-fetch-passages-action.ts`
- Modify: `src/app/(dashboard)/study/study-page-client.tsx`

## Implementation Steps

1. Create `src/app/actions/study-fetch-passages-action.ts`:
   - Server action that calls `getAuthenticatedUser()` then `getUserPassages(userId)`
   - Maps DB Passage rows to `PassageData` (matching the existing client type in `study-types.ts`)
   - Returns `{ passages: PassageData[] }` or `{ error: string }`

2. Modify `src/app/(dashboard)/study/study-page-client.tsx`:
   - Import the new server action
   - Add a `useEffect` that calls it on mount (only when `mounted === true` to avoid SSR issues)
   - On success, `setState(prev => ({ ...prev, passages }))`
   - On error, log but don't block the UI (graceful degradation)

## Success Criteria

- [ ] Upload a passage, reload page, passage still appears in study list
- [ ] Multiple passages from different sessions all appear
- [ ] Empty state still shows when no passages exist
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Risk:** Loading many passages could be slow. **Mitigation:** `getUserPassages` already orders by `createdAt desc`; no pagination needed for now (typical user has <100 passages).
