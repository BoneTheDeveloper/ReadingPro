# Phase 04: Replace Demo User with Authenticated User

## Context

- **Issue:** https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22
- **Branch:** `feature/supabase-auth`
- **Depends on:** Phase 01 (client utils), Phase 03 (middleware for route protection)
- **Risk:** HIGHEST PHASE — touches all user-facing actions and routes

## Overview

Replace all `getOrCreateDemoUser()` calls and inline demo user patterns with a single `getAuthenticatedUser()` helper that reads the Supabase session and returns the corresponding local user. Also add ownership checks to actions/routes that currently operate on resource IDs without verification.

## Requirements

### Functional
- Single `getAuthenticatedUser()` helper used by all server actions and API routes
- Returns the local `User` record (from Prisma), synced with Supabase Auth
- Auto-syncs user profile if local record missing (first login edge case)
- Ownership checks added to simplify, generate-questions, session PATCH, card review routes
- All 6 demo user locations eliminated
- Dev mode fallback: keep demo user pattern when `NEXT_PUBLIC_SUPABASE_URL` not set

### Non-Functional
- Minimal changes to existing function signatures
- Error responses consistent with existing patterns

## Architecture

### Current Demo User Locations

```
┌──────────────────────────────────────────────────────────────────────┐
│ SHARED UTILITY (2 consumers)                                         │
│ src/app/actions/study-shared.ts                                      │
│   └── getOrCreateDemoUser()                                          │
│       ├── study-upload-action.ts (line 55)                           │
│       └── analyze.ts (line 77)                                       │
├──────────────────────────────────────────────────────────────────────┤
│ INLINE (3 locations)                                                 │
│ src/app/api/cards/due/route.ts       → db.user.upsert(DEMO_EMAIL)    │
│ src/app/api/progress/stats/route.ts  → db.user.upsert(DEMO_EMAIL)    │
│ src/app/api/study-session/route.ts   → findUnique + create           │
├──────────────────────────────────────────────────────────────────────┤
│ NO USER CONTEXT (4 locations — ownership gap)                        │
│ src/app/actions/study-simplify-action.ts          → passageId only    │
│ src/app/actions/study-generate-questions-action.ts → passageId only    │
│ src/app/api/study-session/route.ts PATCH         → sessionId only    │
│ src/app/api/cards/review/route.ts POST            → cardReviewId only │
└──────────────────────────────────────────────────────────────────────┘
```

### New Architecture

```
src/lib/auth/get-auth-user.ts
  └── getAuthenticatedUser()     ← single source of truth
      ├── Uses createServerActionClient() to get Supabase user
      ├── Looks up local User by supabaseAuthId
      ├── Auto-syncs if local record missing
      └── Throws AuthError if no session

All server actions & API routes:
  → import { getAuthenticatedUser } from '@/lib/auth/get-auth-user'
  → const user = await getAuthenticatedUser()
  → userId = user.id
```

## Related Code Files

### Create
- `src/lib/auth/get-auth-user.ts`

### Modify
- `src/app/actions/study-shared.ts` — replace `getOrCreateDemoUser` with re-export from auth module, or delete
- `src/app/actions/study-upload-action.ts` — use `getAuthenticatedUser()`
- `src/app/actions/analyze.ts` — use `getAuthenticatedUser()`
- `src/app/actions/study-simplify-action.ts` — use `getAuthenticatedUser()` + add ownership check
- `src/app/actions/study-generate-questions-action.ts` — use `getAuthenticatedUser()` + add ownership check
- `src/app/api/cards/due/route.ts` — use `getAuthenticatedUser()`
- `src/app/api/progress/stats/route.ts` — use `getAuthenticatedUser()`
- `src/app/api/study-session/route.ts` — use `getAuthenticatedUser()` (POST + add ownership check to PATCH)
- `src/app/api/cards/review/route.ts` — use `getAuthenticatedUser()` + add ownership check

## Implementation Steps

### Step 1: Create `getAuthenticatedUser()` helper (`src/lib/auth/get-auth-user.ts`)

```typescript
import { createServerActionClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'
import { syncUser } from '@/lib/auth/sync-user'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function getAuthenticatedUser() {
  const supabase = await createServerActionClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()

  if (error || !authUser) {
    throw new AuthError('Not authenticated')
  }

  // Look up local user by Supabase Auth ID
  let user = await db.user.findUnique({
    where: { supabaseAuthId: authUser.id },
  })

  // Auto-sync if local record missing (edge case: DB migration, first login)
  if (!user) {
    user = await syncUser(authUser.id, authUser.email!, authUser.user_metadata?.name)
  }

  return user
}
```

### Step 2: Update server actions (4 files)

**study-upload-action.ts** (line 55):
```diff
- import { getOrCreateDemoUser } from './study-shared';
+ import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

- const user = await getOrCreateDemoUser();
+ const user = await getAuthenticatedUser();
```

**analyze.ts** (line 77):
```diff
- import { getOrCreateDemoUser } from './study-shared';
+ import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

- const user = await getOrCreateDemoUser();
+ const user = await getAuthenticatedUser();
```

**study-simplify-action.ts** — add user context + ownership check:
```typescript
import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

// Inside the action, after fetching passage:
const user = await getAuthenticatedUser()

if (passage.userId !== user.id) {
  return { error: 'Passage not found' }
}
```

**study-generate-questions-action.ts** — add user context + ownership check:
```typescript
import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

// Inside the action, after fetching passage:
const user = await getAuthenticatedUser()

if (passage.userId !== user.id) {
  return { error: 'Passage not found' }
}
```

### Step 3: Update API routes (4 files)

**cards/due/route.ts:**
```diff
- import { db } from '@/lib/db/client';
- const DEMO_USER_EMAIL = 'demo@example.com';
+ import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

  const user = await getAuthenticatedUser();
```

**progress/stats/route.ts:**
```diff
- import { db } from '@/lib/db/client';
- const DEMO_USER_EMAIL = 'demo@example.com';
+ import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

  const user = await getAuthenticatedUser();
```

**study-session/route.ts** POST:
```diff
- const DEMO_USER_EMAIL = 'demo@example.com';
+ import { getAuthenticatedUser } from '@/lib/auth/get-auth-user';

- let user = await db.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
- if (!user) {
-   user = await db.user.create({ data: { email: DEMO_USER_EMAIL, name: 'Demo User' } });
- }
+ const user = await getAuthenticatedUser();
```

**study-session/route.ts** PATCH — add ownership check:
```typescript
const user = await getAuthenticatedUser()

const session = await db.studySession.findUnique({ where: { id: sessionId } })
if (!session || session.userId !== user.id) {
  return NextResponse.json({ error: 'Session not found' }, { status: 404 })
}
```

**cards/review/route.ts** POST — add ownership check:
```typescript
const user = await getAuthenticatedUser()

// Verify the card review belongs to the authenticated user
const review = await db.cardReview.findUnique({
  where: { id: cardReviewId },
  include: { question: true },
})
if (!review || review.userId !== user.id) {
  return NextResponse.json({ error: 'Review not found' }, { status: 404 })
}
```

### Step 4: Handle AuthError in actions

Wrap action calls that may throw `AuthError`. Two approaches:

**Option A (Recommended):** Let the auth error propagate. The middleware already redirects unauthenticated users. If somehow an unauthenticated request reaches the action, it throws, and Next.js handles it.

**Option B:** Add try/catch in each action:
```typescript
} catch (error) {
  if (error instanceof AuthError) {
    return { error: 'Please sign in to continue' }
  }
  // existing error handling
}
```

Go with Option A initially — middleware should catch unauthenticated users before they reach actions.

### Step 5: Clean up `study-shared.ts`

After all consumers are migrated, this file becomes dead code. Delete it.

### Step 6: Clean up dead code in `db/utils.ts`

The existing `createUser()` and `getOrCreateUser()` functions are already dead code. They can remain for now (they'll be useful for the DB migration phase). No changes needed in Phase 04.

## Todo List

- [ ] Create `src/lib/auth/get-auth-user.ts` with `AuthError` class
- [ ] Update `study-upload-action.ts` — replace demo user
- [ ] Update `analyze.ts` — replace demo user
- [ ] Update `study-simplify-action.ts` — add auth + ownership check
- [ ] Update `study-generate-questions-action.ts` — add auth + ownership check
- [ ] Update `cards/due/route.ts` — replace demo user
- [ ] Update `progress/stats/route.ts` — replace demo user
- [ ] Update `study-session/route.ts` POST — replace demo user
- [ ] Update `study-session/route.ts` PATCH — add ownership check
- [ ] Update `cards/review/route.ts` — add auth + ownership check
- [ ] Delete `src/app/actions/study-shared.ts`
- [ ] Verify no `DEMO_USER_EMAIL` or `demo@example.com` references remain
- [ ] Verify TypeScript compilation

## Success Criteria

- Zero `demo@example.com` references in source code
- Zero `getOrCreateDemoUser` references in source code
- `study-shared.ts` deleted
- All 4 actions use `getAuthenticatedUser()`
- All 4 API routes use `getAuthenticatedUser()`
- Ownership checks on simplify, generate-questions, session PATCH, card review POST
- Unauthenticated requests to protected actions return appropriate error
- All existing features work end-to-end with authenticated user

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing upload/analyze flow | High | High | Test each action independently after change; keep git checkpoints |
| `supabaseAuthId` not yet populated for existing demo user | Medium | Medium | Auto-sync handles this; existing data attributed to demo user |
| AuthError not caught properly | Medium | Medium | Test unauthenticated access to each action/route |

## Security Considerations

- Ownership checks prevent users from accessing other users' data
- `getAuthenticatedUser()` validates session server-side (not trusting client cookies alone)
- `AuthError` prevents data leakage — returns generic "not found" instead of "unauthorized"

## Next Steps

- Phase 05: UI updates (user menu in sidebar)
- Phase 06: Testing and validation
