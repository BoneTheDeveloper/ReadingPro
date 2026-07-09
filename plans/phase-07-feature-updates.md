---
phase: 7
title: "Feature Updates"
status: pending
priority: P1
effort: "30min"
dependencies: ["phase-04-auth-server"]
---

# Phase 7: Feature Updates

## Overview

Update all feature Server Actions and services to use the new Better Auth `getUserId` function instead of Clerk's version.

## Requirements

- Functional: All features continue to require authentication
- Non-functional: No breaking changes to feature logic

## Related Code Files

**Modify:**
- `src/services/clerk.ts` — Re-export from new location
- `src/features/studio-panel/actions.ts` — Uses `getUserId`
- `src/features/learning-session/actions.ts` — Uses `getUserId`
- `src/features/upload/actions.ts` — Uses `getUserId`
- `src/features/vocabulary/actions.ts` — Uses `getUserId`
- `src/features/dictionary/actions.ts` — Uses `getUserId`

## Implementation Steps

### 7.1 Update clerk.ts (Backward Compatibility Layer)

Replace contents of `src/services/clerk.ts`:

```ts
import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Wrapper for Server Actions - gets user ID from request context
async function getUserIdFromRequest(): Promise<string> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new Error("Authentication required");
  }

  Sentry.setUser({ id: session.user.id });
  return session.user.id;
}

// Returns null if not authenticated (for pages that handle auth state)
export const getCurrentUser = cache(async () => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) return null;

  Sentry.setUser({ id: session.user.id });

  return prisma.userProfile.findUnique({
    where: { id: session.user.id },
  });
});

// Throws if not authenticated (for API routes and protected pages)
export async function getUserId(): Promise<string> {
  return getUserIdFromRequest();
}
```

### 7.2 Verify All Features Work

No changes needed in feature files — they all import `getUserId` from `@/services/clerk`, which now uses Better Auth.

Verify these files don't need changes:
- `src/features/studio-panel/actions.ts`
- `src/features/learning-session/actions.ts`
- `src/features/upload/actions.ts`
- `src/features/vocabulary/actions.ts`
- `src/features/dictionary/actions.ts`

All should work with the updated `getUserId`.

## Success Criteria

- [ ] `getUserId()` works in all Server Actions
- [ ] `getCurrentUser()` returns UserProfile with auth user data
- [ ] Sentry user context set correctly
- [ ] All features requiring auth throw "Authentication required" when not signed in

## Risk Assessment

- **Risk:** `headers()` from next/headers may not work in all Server Component contexts
- **Mitigation:** Better Auth's session endpoint works with cookies; test thoroughly

## Next Steps

Proceed to Phase 8: Database Migration
