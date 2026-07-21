---
phase: 2
title: "Wire passage service in RSC"
status: pending
priority: P2
effort: "1h"
dependencies: []
---

# Phase 2: Wire passage service in RSC

## Overview

Make the RSC page call `listUserPassages(userId)` from the passage service instead of fetching directly via Prisma. This makes the passage service the single source of truth for all passage reads.

## Context Links

- Related: `src/features/passage/server/services/passage.ts`
- Related: `src/app/[locale]/(dashboard)/study/page.tsx`

## Requirements

- Functional: RSC page loads passages via `listUserPassages` service
- Non-functional: No breaking changes to component props

## Architecture

**Current:**
```tsx
// page.tsx (RSC)
const passages = await prisma.passage.findMany({ where: { userId } });
return <StudyWorkspace initialPassages={passages} />;
```

**Target:**
```tsx
// page.tsx (RSC)
import { listUserPassages } from "@/features/passage";
const passages = await listUserPassages(userId);
return <StudyWorkspace initialPassages={passages} />;
```

The `listUserPassages` service already exists in `src/features/passage/server/services/passage.ts` but was never called. It maps Prisma rows to `PassageData` using the same transformation.

## Related Code Files

- **Modify:** `src/app/[locale]/(dashboard)/study/page.tsx` — replace direct Prisma fetch with service call
- **Modify:** `src/features/passage/server/services/passage.ts` — ensure `listUserPassages` is exported correctly

## Implementation Steps

1. Read current `page.tsx` to find where Prisma fetch happens
2. Read `src/features/passage/server/services/passage.ts` to verify `listUserPassages` exists and returns `PassageData[]`
3. Check that `listUserPassages` is exported from `src/features/passage/index.ts`
4. Replace direct Prisma fetch with:
   ```tsx
   import { listUserPassages } from "@/features/passage";
   const passages = await listUserPassages(userId);
   ```
5. Verify `pnpm typecheck`
6. Verify the page still renders correctly

## Success Criteria

- [ ] `page.tsx` calls `listUserPassages` instead of direct Prisma
- [ ] `listUserPassages` is exported from `@/features/passage` barrel
- [ ] Page loads correctly with passages
- [ ] `pnpm typecheck` passes

## Risk Assessment

- **Risk:** Low — `listUserPassages` already exists and does the same thing
- **Mitigation:** Compare Prisma select fields vs `toPassageData` mapping to ensure all needed fields are included
