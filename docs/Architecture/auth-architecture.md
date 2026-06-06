# Auth Architecture

## Identity Provider

Clerk owns authentication, sessions, sign-in/sign-up UI, and OAuth providers. The app stores a synchronized profile row in `UserProfile`.

## Profile Sync

Server-side auth flows call `getAuthenticatedUser()`:

```text
getAuthenticatedUser()
  -> requireAuth()
  -> getCurrentUser()
  -> Clerk auth()
  -> clerkClient().users.getUser(userId)
  -> syncUser(clerk id, email, name, avatar)
  -> UserProfile
```

`UserProfile.id` is the Clerk user id. This avoids a separate auth-user mapping table.

## Route Protection

`src/proxy.ts` protects dashboard routes, handles auth-page redirects, and delegates locale routing to next-intl. Public/internal routes such as API routes, Next internals, Clerk internals, monitoring, and favicon are excluded as appropriate.

## Ownership

Authenticated routes must enforce ownership with `user.id`:

- Passage reads use `id`, `userId`, and `deletedAt: null`.
- Translation/vocabulary writes verify the `sourceId` belongs to the user.
- Study chat history is keyed by `userId` and `passageId`.
- Card review updates use `id` and `userId`.
- Study sessions use `userId`.

## Auth Failure Handling

| Case | Response |
|------|----------|
| No session on API route | `401` JSON error |
| Authenticated user requests another user's resource | `404` JSON error where possible |
| User visits protected page unauthenticated | Clerk/locale redirect to sign-in |

## Environment

Use separate Clerk development and production instances. Do not reuse production Clerk secrets in local development or preview environments.

