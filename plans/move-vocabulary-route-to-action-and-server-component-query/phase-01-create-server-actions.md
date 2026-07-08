---
phase: 1
title: "Create Server Actions"
status: completed
priority: P1
effort: "4-6h"
dependencies: []
---

# Phase 1: Create Server Actions

## Overview

Create Server Actions for vocabulary mutations following the pattern:
- Zod validation for inputs
- `getUserId()` for auth
- `revalidatePath()` for cache invalidation
- Return typed results for `useActionState`

## Requirements

- Functional: All 9 write operations callable as Server Actions
- Non-functional: Type-safe, validated, revalidates cache after mutation

## Architecture

```
Client Component
    ↓ useActionState
Server Action ("use server")
    ↓ validate input
    ↓ getUserId()
    ↓ call service
    ↓ revalidatePath()
    ↓ return result
```

## Related Code Files

**Create:**
- `src/features/vocabulary/actions.ts` - All mutations with "use server"

**Read (reference only):**
- `src/features/vocabulary/services/vocabulary-items.service.ts`
- `src/features/vocabulary/services/vocabulary-sets.service.ts`
- `src/app/api/vocabulary/route.ts` (validation pattern)
- `src/app/api/vocabulary/[id]/route.ts` (validation pattern)

## Implementation Steps

1. **Create `src/server/` directory** if not exists (follow existing patterns in codebase)

2. **Create validation schemas** (`vocabulary-items.schemas.ts`):
   ```typescript
   export const saveVocabularyItemSchema = z.object({
     selectedText: z.string().trim().min(1).max(500),
     translation: z.string().trim().min(1).max(500),
     // ... rest from route.ts
   });
   ```

3. **Create vocabulary items actions** (`vocabulary-items.actions.ts`):
   - `saveVocabularyItem(input)` - POST /api/vocabulary
   - `deleteVocabularyItem(itemId)` - DELETE /api/vocabulary/[id]
   - `updateVocabularyStatus(itemId, status)` - PATCH /api/vocabulary/[id]/status
   - `submitVocabularyReview(itemId, isCorrect)` - POST /api/vocabulary/[id]/review

4. **Create vocabulary sets actions** (`vocabulary-sets.actions.ts`):
   - `createVocabularySet(name)` - POST /api/vocabulary/sets
   - `updateVocabularySet(setId, name)` - PATCH /api/vocabulary/sets/[id]
   - `deleteVocabularySet(setId)` - DELETE /api/vocabulary/sets/[id]
   - `addItemsToVocabularySet(setId, itemIds)` - POST /api/vocabulary/sets/[id]/items
   - `removeItemFromVocabularySet(setId, itemId)` - DELETE /api/vocabulary/sets/[id]/items/[itemId]

5. **For each action**:
   - Add `"use server"` directive
   - Validate input with Zod schema
   - Call `getUserId()` for auth
   - Call appropriate service function
   - Call `revalidatePath("/vocabulary")` or similar
   - Return typed result or throw domain error

## Success Criteria

- [ ] `saveVocabularyItem` Server Action created and tested
- [ ] `deleteVocabularyItem` Server Action created and tested
- [ ] `updateVocabularyStatus` Server Action created and tested
- [ ] `submitVocabularyReview` Server Action created and tested
- [ ] `createVocabularySet` Server Action created and tested
- [ ] `updateVocabularySet` Server Action created and tested
- [ ] `deleteVocabularySet` Server Action created and tested
- [ ] `addItemsToVocabularySet` Server Action created and tested
- [ ] `removeItemFromVocabularySet` Server Action created and tested
- [ ] All actions have Zod validation
- [ ] All actions revalidate appropriate paths
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Risk**: Validation schema drift between route and server action
- **Mitigation**: Move schemas to shared location, import in both
- **Risk**: Breaking existing clients during migration
- **Mitigation**: Keep routes in Phase 4, verify client migration in Phase 2 first
