---
phase: 3
title: "Update Server Component Pages"
status: completed
priority: P1
effort: "2-3h"
dependencies: ["phase-01-create-server-actions", "phase-02-update-client-components"]
---

# Phase 3: Update Server Component Pages

## Overview

Migrate read operations from API routes to direct service calls in Server Components. This follows the convention: reads happen at render time in Server Components, not via HTTP.

## Requirements

- Functional: Pages fetch data via direct service calls
- Non-functional: No network hop for reads, native Next.js caching

## Architecture

```
Before:
  Page → fetch('/api/vocabulary/list') → API Route → Service → DB

After:
  Page (Server Component) → Service → DB
```

## Related Code Files

**Modify:**
- `src/app/[locale]/(dashboard)/vocabulary/page.tsx` - Update to use Server Component pattern

**Read (reference):**
- `src/features/vocabulary/services/vocabulary-items.service.ts`
- `src/features/vocabulary/services/vocabulary-sets.service.ts`

**Routes to migrate reads from:**
- `src/app/api/vocabulary/list/route.ts` → Direct service call
- `src/app/api/vocabulary/stats/route.ts` → Direct service call
- `src/app/api/vocabulary/sets/route.ts` (GET) → Direct service call

## Implementation Steps

1. **Create server-side data fetchers** (can reuse or refactor existing services):
   - `getVocabularyListServer(params)` - direct service call
   - `getVocabularyStatsServer()` - direct service call
   - `getVocabularySetsServer()` - direct service call

2. **Update vocabulary page** to fetch in Server Component:
   ```typescript
   // src/app/[locale]/(dashboard)/vocabulary/page.tsx
   import { getVocabularyListServer, getVocabularyStatsServer } from "@/features/vocabulary/services/vocabulary-items.service";

   export default async function VocabularyPage() {
     const userId = await getUserId();
     const [list, stats] = await Promise.all([
       getVocabularyItemList({ userId, page: 1, pageSize: 20 }),
       getVocabularyItemStats(userId),
     ]);

     return <VocabularyClientPage initialList={list} initialStats={stats} />;
   }
   ```

3. **Update client component** to receive initial data as props:
   - Change from `useEffect` + fetch to prop-based initial state
   - Use `useTransition` for any client-side refetches

4. **Handle search/filter params**:
   - For search: Use URL searchParams, pass to Server Component
   - For pagination: Use URL params, Server Component fetches correct page

5. **Add revalidation** where appropriate:
   - `export const revalidate = 60` for list pages
   - Or use `revalidateTag` for more granular control

## Success Criteria

- [ ] Vocabulary page uses Server Component for initial data
- [ ] No fetch to `/api/vocabulary/list` on page load
- [ ] No fetch to `/api/vocabulary/stats` on page load
- [ ] No fetch to `/api/vocabulary/sets` on page load (if applicable)
- [ ] Pagination works via URL params
- [ ] Search works via URL params
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Risk**: Complex client-side state that depends on fetch
- **Mitigation**: Identify all side effects from fetch, move to server or use `useTransition`
- **Risk**: Real-time updates needed
- **Mitigation**: Use `revalidatePath` on mutations, or polling for critical cases
