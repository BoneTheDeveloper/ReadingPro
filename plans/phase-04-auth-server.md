---
phase: 4
title: "Auth Server"
status: pending
priority: P1
effort: "30min"
dependencies: ["phase-02-install-configure"]
---

# Phase 4: Auth Server

## Overview

Mount Better Auth's API handler at `/api/auth/[...all]` to handle all auth endpoints (sign-in, sign-up, sign-out, OAuth callbacks, session management).

## Requirements

- Functional: All auth API endpoints available at `/api/auth/*`
- Non-functional: Works with Next.js App Router

## Architecture

```
app/api/auth/[...all]/route.ts → Better Auth handler
```

Better Auth provides a Next.js adapter that mounts all required endpoints.

## Related Code Files

**Create:**
- `src/app/api/auth/[...all]/route.ts` — Better Auth API handler

**Delete (later):**
- `src/app/api/webhooks/clerk/route.ts` — Replaced by Better Auth's internal hooks

## Implementation Steps

### 4.1 Create Auth API Route

Create directory and file: `src/app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

This single file handles all auth endpoints:
- `GET/POST /api/auth/sign-in` — Email/password sign-in
- `GET/POST /api/auth/sign-up` — Email/password sign-up
- `POST /api/auth/sign-out` — Sign-out
- `GET /api/auth/session` — Get current session
- `GET /api/auth/callback/{provider}` — OAuth callbacks (Google, etc.)
- `POST /api/auth/verification` — Email verification

### 4.2 Create User Service (getUserId wrapper)

Update `src/services/clerk.ts` to create a new auth service that wraps Better Auth:

```ts
import "server-only";
import { auth } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";
import { cache } from "react";
import { ensureUserProfile } from "@/features/users/db/sync-user";

// Returns null if not authenticated (for pages that handle auth state)
export const getCurrentUser = cache(async () => {
  // This needs a request context - use in Server Components only
  // For API routes, pass headers explicitly
  return null; // Placeholder - actual implementation below
});

// For use in Server Actions (request context available)
export async function getUserId(): Promise<string> {
  // In Server Actions, we get the request from context
  // Better Auth's getSession works with headers
  // For Server Actions, we'll use a different approach
  throw new Error("Use auth.api.getSession({ headers }) in Server Actions");
});
```

Actually, Better Auth recommends using the client-side `authClient` for session in components, and for Server Actions, you typically use the API route pattern. Let's create a proper solution:

Create `src/lib/auth-server.ts`:

```ts
import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as Sentry from "@sentry/nextjs";

// Get session from request headers (for middleware/API routes)
export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

// Get user ID from session (for Server Actions)
export async function getUserIdFromSession(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  return session.user.id;
}

// Get full user profile (links Better Auth user to UserProfile)
export async function getCurrentUserProfile(userId: string) {
  return prisma.userProfile.findUnique({
    where: { id: userId },
  });
}
```

Update `src/services/clerk.ts` to export from new location (for backward compatibility during migration):

```ts
// Re-export from new location for backward compatibility
export { getUserId as getUserId } from "@/lib/auth-server";
export { getCurrentUserProfile as getCurrentUser } from "@/lib/auth-server";
```

## Success Criteria

- [ ] `/api/auth/[...all]/route.ts` created and exports GET/POST
- [ ] All Better Auth endpoints accessible
- [ ] `getUserId` function available for feature actions

## Risk Assessment

- **Risk:** Server Action session retrieval differs from API routes
- **Mitigation:** Use `headers()` from next/headers in Server Actions to pass to auth

## Next Steps

Proceed to Phase 5: Auth Client
