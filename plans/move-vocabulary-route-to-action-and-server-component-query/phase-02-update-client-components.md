---
phase: 2
title: "Update Client Components"
status: completed
priority: P1
effort: "2-3h"
dependencies: ["phase-01-create-server-actions"]
---

# Phase 2: Update Client Components

## Overview

Update `vocabulary-client.ts` to use Server Actions instead of fetch calls. Components consuming these functions will automatically work once client is updated.

## Requirements

- Functional: All mutation functions use `useActionState` pattern
- Non-functional: No network fetch for mutations, types preserved

## Architecture

```
Before:
  Client → fetch() → API Route → Service → Prisma

After:
  Client → useActionState → Server Action → Service → Prisma
```

## Related Code Files

**Modify:**
- `src/features/vocabulary/vocabulary-client.ts` - Update all mutation functions

**Read (reference):**
- `src/features/vocabulary/actions.ts`

**Update (likely):**
- Any component using `updateVocabularyItemStatus`, `deleteVocabularyItem`, `createVocabularySet`, `deleteVocabularySet`

## Implementation Steps

1. **Update imports** in `vocabulary-client.ts`:
   - Remove `patchJson`, `deleteJson`, `postJson` imports
   - Import Server Actions from `src/server/actions/vocabulary/`

2. **Update mutation functions to use actionState pattern**:

   ```typescript
   // Before (fetch)
   export async function deleteVocabularyItem(id: string) {
     const result = await deleteJson(`/api/vocabulary/${id}`, ...);
     // ...
   }

   // After (server action)
   export function useDeleteVocabularyItem() {
     const [state, formAction, isPending] = useActionState(
       deleteVocabularyItemAction,
       initialState
     );
     return { state, formAction, isPending };
   }
   ```

3. **For each mutation function**:
   - `updateVocabularyItemStatus` → Server Component + Client Hook
   - `deleteVocabularyItem` → Server Component + Client Hook
   - `createVocabularySet` → Server Component + Client Hook
   - `deleteVocabularySet` → Server Component + Client Hook

4. **Find all consumers** of these functions and update them to use the new hook pattern

5. **Handle read functions** (keep as-is or move to Server Components):
   - `getVocabularyList` - Move to Server Component
   - `getVocabularySets` - Move to Server Component
   - `getVocabularyStats` - Move to Server Component

## Success Criteria

- [ ] `vocabulary-client.ts` imports Server Actions
- [ ] All mutation functions refactored to `useActionState`
- [ ] Components using mutations updated
- [ ] No remaining `fetch` calls for vocabulary mutations
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Risk**: Components need refactoring to use `useActionState` differently
- **Mitigation**: Create wrapper hooks that match existing function signatures where possible
- **Risk**: Multiple components consuming these functions
- **Mitigation**: Update them one by one, test after each
