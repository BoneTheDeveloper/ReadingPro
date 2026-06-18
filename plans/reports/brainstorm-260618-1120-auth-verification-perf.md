# Brainstorm: Auth verification per-request cost

Date: 2026-06-18 · Status: design agreed, ready for `/ck:plan`

## Problem

`getCurrentUser()` (`src/server/auth/auth-utils.ts:22`) runs on every authenticated
request via 33 call sites. Per request it does:

1. `clerkClient().users.getUser(userId)` — Clerk **Backend API** network call, counts
   against rate limit.
2. `syncUser()` — DB `upsert` on `UserProfile`.

`cache()` only dedupes within a single request, not across requests. So every request
pays the network call + DB write.

Confirmed waste: across `src/` (non-test), **only `user.id` is ever read** — 54 uses of
`user.id`, **zero** uses of `user.email` / `user.name` / `user.avatarUrl` at request time.
The expensive fetch populates fields nobody reads.

## Clerk official guidance (researched)

- `auth()` = sub-ms JWT validation, **no Backend API call**, returns `userId`.
- `currentUser()` / `clerkClient().users.getUser()` = **counts against Backend API rate
  limit** (network). Use only when name/email genuinely needed.
- Recommended pattern: store Clerk `userId` in DB, read other fields from session token.
- Webhook sync is **eventually consistent**; Clerk provides **no built-in fallback** for
  the new-user race.

Sources: clerk.com/docs/nextjs/guides/users/reading ·
clerk.com/docs/reference/nextjs/app-router/auth ·
clerk.com/docs/guides/development/webhooks/syncing

## Agreed solution

**1. Hot path — new `getUserId()`** (replaces heavy call in all routes)
```ts
export const getUserId = async () => {
  const { userId } = await auth();      // JWT only — no network, no DB
  if (!userId) throw new AuthenticationRequiredError();
  return userId;
};
```
Routes only consume `user.id`, so migrate all 32 routes `getAuthenticatedUser().id` →
`getUserId()`. **Migrate all now** (one pass).

**2. Profile freshness — Clerk webhook** `/api/webhooks/clerk`
- Subscribe `user.created`, `user.updated`, `user.deleted`.
- Verify with `verifyWebhook()` (svix HMAC-SHA256).
- created/updated → `syncUser` upsert; deleted → cleanup/soft-delete.

**3. Race-safe fallback — ensure-on-first-write** (chosen)
- Idempotent `ensureUserProfile(userId)` upsert at the few FK-creating write routes.
- Removes the eventually-consistent race; near-zero cost; no extra infra.

**4. Keep `getCurrentUser()`** for any future place needing email/name — no longer the
default gate.

## Net effect

- Read routes: 1 Backend API call + 1 DB upsert  →  one JWT verify.
- Writes: at most one idempotent upsert, once per new user.
- Authorization model unchanged: every query still scoped by `userId`.

## Touchpoints

- `src/server/auth/auth-utils.ts` — add `getUserId()`, keep `getCurrentUser`.
- `src/server/auth/sync-user.ts` — reuse for webhook + `ensureUserProfile`.
- 32 API routes under `src/app/api/**` — swap gate call.
- New: `src/app/api/webhooks/clerk/route.ts` + svix secret env var.
- Clerk Dashboard: configure webhook endpoint + events.

## Decisions

- Approach: A + B (fast `getUserId` + webhook sync).
- Profile sync: Clerk webhook.
- Race fallback: ensure-on-first-write.
- Migration: all 32 routes now.

## Open questions

- `user.deleted` handling: hard-delete vs soft-delete `UserProfile` (FK cascade impact on
  vocabulary/artifacts/sessions) — decide in plan.
- Webhook secret management (Vercel env) — ops step.
