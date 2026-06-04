---
phase: 3
title: "Clerk Auth and Profile Lifecycle"
status: pending
priority: P1
effort: "8h"
dependencies: [2]
---

# Phase 3: Clerk Auth and Profile Lifecycle

## Overview

Replace Supabase sessions and custom credential/OAuth handling with Clerk while
preserving localized embedded auth pages. Add race-safe synchronous profile
bootstrap and verified webhook synchronization/deletion.

## Context Links

- [Plan](./plan.md)
- [Current proxy](../../../src/proxy.ts)
- [Current auth utilities](../../../src/lib/auth/auth-utils.ts)
- [Current sign-in](../../../src/app/[locale]/(auth)/sign-in/page.tsx)
- [Current sign-up](../../../src/app/[locale]/(auth)/sign-up/page.tsx)
- [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)

## Requirements

- Functional:
  - Clerk authenticates all protected pages, actions, and API routes.
  - Existing localized sign-in/sign-up URLs remain primary UX.
  - Authenticated app requests always have a corresponding `profiles` row.
  - Clerk create/update/delete events synchronize profile lifecycle.
  - Missing/delayed webhooks do not block first authenticated request.
- Non-functional:
  - Authoritative user ID comes only from Clerk server auth.
  - Webhooks are signature verified and idempotent.
  - No token-keyed in-memory profile cache.

## Architecture

```text
Request
  -> clerkMiddleware + next-intl proxy
  -> requireAuthUserId()
       -> Clerk auth() userId
       -> profile lookup by Clerk userId
       -> if missing: currentUser() + idempotent upsert
       -> return Clerk userId

Clerk webhook (public route, verified)
  -> user.created/user.updated: upsert cached profile metadata
  -> user.deleted: cleanup private blobs, delete profile, cascade DB rows
```

Expose two explicit auth APIs:

- `requireAuthUserId(): Promise<string>` authenticates, guarantees the profile
  FK parent exists, then returns Clerk ID for scoped operations.
- `requireAppProfile(): Promise<UserProfile>` returns the guaranteed profile for
  UI/profile metadata.

Do not return or accept client-provided identity as authoritative.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Modify | `package.json`, `pnpm-lock.yaml` | Add Clerk Next.js/localization/webhook dependencies | Install/build |
| Modify | `src/proxy.ts` | Compose `clerkMiddleware` with locale routing and public route matchers | Proxy/auth tests |
| Modify | `src/app/[locale]/layout.tsx` | Locale-aware `ClerkProvider` | Component/build |
| Move/create | `src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx` | Embedded Clerk `<SignIn />` | E2E |
| Move/create | `src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx` | Embedded Clerk `<SignUp />` | E2E |
| Delete | `src/app/auth/callback/route.ts` | Clerk owns callbacks | Route smoke |
| Modify | `src/lib/auth/auth-utils.ts` | Clerk auth ID/profile helpers | Auth unit/integration |
| Create | `src/lib/auth/profile-sync.ts` | Profile mapping/upsert/delete orchestration | Unit/integration |
| Delete | `src/lib/auth/auth-cache.ts`, `src/lib/auth/sync-user.ts` | Remove Supabase token/profile lifecycle | Unit cleanup |
| Create | `src/app/api/webhooks/clerk/route.ts` | Verified lifecycle webhook | Route integration |
| Modify | `src/components/layout/use-sign-out.ts` | Clerk sign-out with localized redirect | Component unit |
| Modify | `tests/vitest/mocks/*`, `tests/vitest/setup/vitest.setup.ts` | Clerk auth/current-user mocks | All tests |

## Interface Checklist

- [ ] `requireAuthUserId()` guarantees profile then returns Clerk string ID or
  throws typed auth error.
- [ ] `requireAppProfile()` upserts missing profile without race failure.
- [ ] Clerk-to-profile mapper handles missing primary email/name/image.
- [ ] Profile metadata updates do not overwrite app-owned profile fields.
- [ ] Webhook replay is idempotent.
- [ ] Delete event handles already-deleted profiles.
- [ ] Proxy excludes webhook/monitoring/static paths and preserves locale redirect.

## Implementation Steps

1. Add Clerk packages and environment validation.
2. Add locale-aware Clerk provider using English/Vietnamese Clerk localizations.
3. Replace Supabase session work in `src/proxy.ts` with Clerk middleware and
   existing next-intl negotiation.
4. Convert auth pages to embedded catch-all Clerk routes; configure sign-in,
   sign-up, fallback, and post-auth redirect URLs.
5. Replace auth utilities with Clerk ID/profile helpers.
6. Implement profile mapper and `upsert` bootstrap using Clerk `currentUser()`
   only when the DB row is missing.
7. Add verified Clerk webhook route for user create/update/delete.
8. Replace sign-out hook with Clerk SDK behavior and locale-aware redirect.
9. Delete callback/token-cache/sync logic that is no longer reachable.
10. Add focused auth/profile/proxy/webhook tests before converting all callers.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | Authenticated Clerk user without profile | First request creates profile and succeeds |
| Critical | Two concurrent first requests | One stable profile; no unique/FK failure |
| Critical | Forged webhook | Rejected before DB/storage calls |
| Critical | `user.deleted` replay | Idempotent success |
| High | `/en/sign-in` and `/vi/sign-in` | Embedded localized Clerk UI |
| High | Authenticated user visits auth page | Redirected to localized app route |
| High | Unauthenticated user visits protected route | Redirected to localized sign-in with safe return path |
| High | User update webhook | Cached email/name/avatar updated; app-owned fields unchanged |
| Medium | Clerk user lacks email/name/avatar | Nullable profile metadata accepted |

## Dependency Map

- Requires Phase 2 text Clerk identity schema.
- Blocks Phase 4 caller and authorization conversion.
- User-delete blob cleanup is completed in Phase 5.
- Clerk E2E and deployment secrets are completed in Phases 6 and 8.

## Success Criteria

- [ ] Clerk is the only authentication/session provider in active code.
- [ ] Localized embedded auth pages preserve approved URLs and branding shell.
- [ ] Profile bootstrap removes webhook timing race.
- [ ] Verified webhooks synchronize user metadata and deletion.
- [ ] Sign-out and protected-route redirects work.
- [ ] Auth/profile tests cover race, replay, invalid signature, and missing metadata.

## Risk Assessment

- Risk: Clerk middleware and next-intl response composition lose locale/cookies.
  Mitigation: dedicated proxy integration cases for public/protected/auth routes.
- Risk: webhook arrives before/after synchronous upsert.
  Mitigation: idempotent upsert/delete operations.
- Risk: auth helper contract changes break many routes.
  Mitigation: preserve `getAuthenticatedUser()` compatibility temporarily, then
  migrate callers in Phase 4 and remove alias in Phase 7.

## Security Considerations

- Verify webhook signature over raw request before parsing trusted payload.
- Never trust user ID, email, tier, or role from request body.
- Do not log Clerk secrets, session tokens, or full webhook payloads.
- Validate all post-auth return paths with existing safe redirect helper.
