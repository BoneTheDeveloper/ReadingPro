---
phase: 4
title: "Remove Old API Routes"
status: completed
priority: P2
effort: "1-2h"
dependencies: ["phase-01-create-server-actions", "phase-02-update-client-components", "phase-03-update-server-component-pages"]
---

# Phase 4: Remove Old API Routes

## Overview

**API routes are KEPT** for external clients (mobile app, third-party services). This phase only removes routes that are no longer needed.

The pattern is:
```
Server Component  ─┐
Server Action     ─┼─→  Service → Repository → DB
API Route (giữ)   ─┘        (dùng cho client ngoài)
```

After migration:
- Next.js pages use Server Components (reads) + Server Actions (writes)
- External clients continue using API Routes via fetch

## Requirements

- Functional: All 12 API routes removed
- Non-functional: No broken imports or dangling references

## Related Code Files

**Delete:**
- `src/app/api/vocabulary/route.ts`
- `src/app/api/vocabulary/[id]/route.ts`
- `src/app/api/vocabulary/[id]/status/route.ts`
- `src/app/api/vocabulary/[id]/review/route.ts`
- `src/app/api/vocabulary/list/route.ts`
- `src/app/api/vocabulary/stats/route.ts`
- `src/app/api/vocabulary/sets/route.ts`
- `src/app/api/vocabulary/sets/[id]/route.ts`
- `src/app/api/vocabulary/sets/[id]/items/route.ts`
- `src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts`

## Implementation Steps

1. **Verify Phase 3 is complete** - All pages use Server Components

2. **Search for remaining API route usage**:
   ```bash
   grep -r "/api/vocabulary" src/
   ```

3. **Delete routes one by one** (safest approach):
   - Start with least critical routes
   - Test after each deletion

4. **Clean up any unused types** in shared files

5. **Run typecheck** to ensure no broken imports

## Success Criteria

- [ ] All `/api/vocabulary/*` routes deleted
- [ ] No remaining fetch calls to vocabulary API from Next.js pages
- [ ] TypeScript compiles without errors
- [ ] App functions correctly with Server Actions
