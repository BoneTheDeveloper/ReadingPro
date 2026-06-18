---
phase: 1
title: Fast-path getUserId (TDD)
status: completed
priority: P1
effort: 2h
dependencies: []
---

# Phase 1: Fast-path getUserId (TDD)

## Overview

Add `getUserId()` to `src/server/auth/auth-utils.ts` that returns the verified Clerk
`userId` from the session JWT only — no `clerkClient()` Backend API call, no DB write.
This is the new hot-path gate. `getCurrentUser()` / `getAuthenticatedUser()` stay intact.

## Requirements

- Functional:
  - `getUserId()` calls `auth()`, returns `userId: string` when present.
  - Throws `AuthenticationRequiredError` when `userId` is null (same error type routes
    already map to 401 via `isAuthenticationRequiredError`).
  - Does NOT call `clerkClient()` and does NOT touch `db`.
- Non-functional:
  - No behavior change to `getCurrentUser` / `requireAuth` / `getAuthenticatedUser`.
  - Wrap in React `cache()` for per-request dedupe (cheap, matches existing style).

## Architecture

```ts
// src/server/auth/auth-utils.ts (add)
export const getUserId = cache(async (): Promise<string> => {
  const { userId } = await auth();      // JWT verify only — no network, no DB
  if (!userId) throw new AuthenticationRequiredError();
  return userId;
});
```

`auth()` is already imported. `AuthenticationRequiredError` already exported. Per Clerk
docs, `auth()` does sub-ms JWT validation and does NOT count against the Backend API rate
limit (unlike `currentUser()` / `clerkClient().users.getUser()`).

## Related Code Files

- Modify: `src/server/auth/auth-utils.ts` (add `getUserId`)
- Modify: `src/server/auth/auth-utils.test.ts` (add `getUserId` tests; keep existing
  `getCurrentUser` tests as the behavior lock)

## Implementation Steps

1. **TDD — write failing tests first** in `auth-utils.test.ts`:
   - `getUserId` returns `userId` when `auth()` resolves `{ userId: "user_x" }`.
   - `getUserId` rejects with `AuthenticationRequiredError` when `{ userId: null }`.
   - `getUserId` does NOT call `clerkClient` and does NOT call `db.userProfile.upsert`
     (assert `clerkMocks.clerkClient` not called, `db.userProfile.upsert` not called).
   - Keep all existing `getCurrentUser` tests passing unchanged (regression lock).
2. Run tests — confirm the new `getUserId` tests fail (function not yet exported).
3. Implement `getUserId` per Architecture snippet.
4. Run `pnpm run test src/server/auth` — all green.
5. `pnpm run typecheck`.

## Success Criteria

- [ ] New `getUserId` tests written first and initially failing
- [ ] `getUserId` returns verified userId; throws typed error on no session
- [ ] Tests assert no `clerkClient` and no `db` access in `getUserId`
- [ ] Existing `getCurrentUser`/`requireAuth` tests still pass unchanged
- [ ] `pnpm run typecheck` clean

## Risk Assessment

- Low risk: additive function, no existing call sites changed in this phase.
- Mitigation: existing auth tests act as regression lock; nothing removed yet.
