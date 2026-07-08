---
name: vocabulary-server-actions-migration
description: Migrate vocabulary API routes to Next.js Server Actions
metadata:
  type: brainstorm
  created: 2026-07-08
---

# Vocabulary Server Actions Migration - Design Summary

## Problem
Current app uses traditional API routes (`/api/vocabulary/*`) for all data operations. Want to adopt Next.js Server Actions pattern for mutations.

## Data Access Convention (User's Preference)
- **Reads (queries)**: Fetch directly in Server Components at render time
- **Writes (mutations)**: Handle exclusively by Server Actions via `useActionState`/`useTransition`

## Scope

### Routes to Migrate

**Server Components (Reads - direct service calls):**
| Route | Action |
|-------|--------|
| `GET /api/vocabulary/list` | → Server Component page/layout |
| `GET /api/vocabulary/stats` | → Server Component |
| `GET /api/vocabulary/sets` | → Server Component |

**Server Actions (Writes - useActionState):**
| Route | Method | Server Action |
|-------|--------|---------------|
| `/api/vocabulary` | POST | `saveVocabularyItem` |
| `/api/vocabulary/[id]` | DELETE | `deleteVocabularyItem` |
| `/api/vocabulary/[id]/status` | PATCH | `updateVocabularyStatus` |
| `/api/vocabulary/[id]/review` | POST | `submitVocabularyReview` |
| `/api/vocabulary/sets` | POST | `createVocabularySet` |
| `/api/vocabulary/sets/[id]` | PATCH | `updateVocabularySet` |
| `/api/vocabulary/sets/[id]` | DELETE | `deleteVocabularySet` |
| `/api/vocabulary/sets/[id]/items` | POST | `addItemToVocabularySet` |
| `/api/vocabulary/sets/[id]/items/[itemId]` | DELETE | `removeItemFromVocabularySet` |

## Architecture

### Before (Current)
```
Client → fetch() → API Route → Service → Prisma
```

### After (Target)
```
READS:  Server Component → direct service call → Prisma
WRITE:  Client → useActionState → Server Action → Service → Prisma
```

## Key Decisions

1. **Keep service layer** - Services in `src/features/vocabulary/services/` already have clean abstractions
2. **Add revalidation** - Server Actions call `revalidatePath`/`revalidateTag` after mutations
3. **Validation stays** - Zod schemas remain in Server Actions
4. **Auth preserved** - Same `getUserId()` server-side call
5. **File location** - Server Actions: `src/server/actions/vocabulary/*.ts`

## Implementation Order

1. Create Server Action files for vocabulary items (CRUD)
2. Create Server Action files for vocabulary sets (CRUD)
3. Update client components to use `useActionState`
4. Add `revalidatePath` calls to Server Actions
5. Update pages to use Server Components for reads
6. Delete old API routes (or keep stubs temporarily)

## Out of Scope (This Round)
- Dictionary routes
- Upload routes
- Studio routes
- Webhook routes
- External API clients (none exist per user confirmation)

## Dependencies
- Next.js 16.2.6 (supports Server Actions)
- React 19.2.6 (useActionState)
- Zod 4.x (validation)
