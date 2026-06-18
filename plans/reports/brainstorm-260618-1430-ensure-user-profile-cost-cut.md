# Brainstorm: Cut the permanent cost of `ensureUserProfile`

Date: 2026-06-18 · Status: design agreed, ready for `/ck:plan`
Scope: `src/server/auth/sync-user.ts` (`ensureUserProfile`) + Clerk webhook interplay.

## Problem

`ensureUserProfile(userId)` is called *before* every FK-creating write (~10 prod call
sites across 5 modules). Each call is a Prisma `upsert` round-trip. The translation write
path (`upsertTranslationCache`, `createTranslationHistory` — `translation-queries.ts:79,105`)
is **very hot** (fires on most word/sentence selections).

The race it guards — a brand-new user writing before the Clerk webhook lands — lasts only
**minutes**, **once per user lifetime**. Current design pays the upsert tax on every write
**forever** to insure that transient window. Wrong trade.

### The race is already mostly closed by two other mechanisms

- **Webhook** (`/api/webhooks/clerk`) → `syncUser` upsert. Primary sync; short window.
- **Dashboard render**: `DashboardPage` (`[locale]/page.tsx:254`) calls `getCurrentUser()`
  → `syncUser()` → upsert. Clerk lands new users on `/` after sign-up, so the row is
  typically created on first server render — before the user reaches study/translate.

So the per-write `ensureUserProfile` is redundant ~100% of the time; it only earns its
keep for a new user who hits a write API before any `getCurrentUser` page renders.

## Decision (user-confirmed)

- **Approach: Optimistic FK-catch (lazy ensure).** Stop ensuring before writes. Try the
  write; only on a `UserProfile`-FK violation, create the profile and retry once.
- **FK matcher: `userId` FK only.** Must NOT swallow other FK failures (translation writes
  also carry a `sourceId`/passage FK — a missing one is a real bug and must propagate).
- Keep the webhook unchanged as the **primary** sync mechanism.
- Do **not** fully remove the fallback (relying on the temporary `getCurrentUser` in
  `page.tsx` is implicit + fragile).

## Design

One DRY helper replaces all pre-emptive calls:

```ts
// sync-user.ts
export async function withUserProfile<T>(userId: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (isMissingUserProfileFk(e)) {   // Prisma P2003 on the userId FK only
      await ensureUserProfile(userId);
      return await write();            // first attempt inserted nothing → clean retry
    }
    throw e;
  }
}
```

`isMissingUserProfileFk(e)`: `e` is `Prisma.PrismaClientKnownRequestError`, `e.code === 'P2003'`,
and the failing constraint references the `userId` relation (constraint name contains
`userId`, e.g. `translation_caches_userId_fkey`). **Verify exact `meta` shape against
Prisma 7.8 at implementation time.**

Call-site shape (was: `await ensureUserProfile(x); return db.x.create(...)`):

```ts
return withUserProfile(userId, () => db.translationCache.upsert({ ... }));
```

`ensureUserProfile` is retained but now only invoked *inside* the wrapper. Webhook +
`deleteUserProfile` unchanged.

## Cost profile (the point of the change)

| Case | Extra round-trips | Frequency |
|------|-------------------|-----------|
| Profile exists (steady state) | **0** | ~every write, forever |
| Profile missing (new-user race) | +2 (ensure + retry) | a handful, only first minutes of a user's life |

## Touchpoints

- `src/server/auth/sync-user.ts` — add `withUserProfile` + `isMissingUserProfileFk`; keep
  `ensureUserProfile`, `syncUser`, `deleteUserProfile`.
- `src/server/db/translation-queries.ts` (3 sites: `upsertTranslationCache`,
  `createTranslationHistory`, +1).
- `src/server/db/vocabulary-queries.ts` (1), `vocabulary-set-queries.ts` (3),
  `study-session-queries.ts` (2).
- `src/server/modules/upload/passage-create/passage-create.service.ts` (1).
- Test fixture route `src/app/api/test/translate-performance-fixtures/route.ts` (1).

## Risks & mitigations

- **FK over-matching (critical).** Translation writes have `userId` + `sourceId` FKs. A
  broad P2003 catch would mask a missing `sourceId` as transient. Mitigation: matcher keys
  on the `userId` constraint only; unit test asserts a non-userId P2003 propagates.
- **Transactional write** `ensureActiveSession` (`study-session-queries.ts:46`, `$transaction`
  + advisory lock). Wrap the **whole** function (the `$transaction` call) so an FK rollback
  → ensure → clean retry of the atomic block. Do NOT put the catch inside the tx.
- **Prisma 7.8 `P2003` meta shape** must be confirmed (constraint vs field_name) before the
  matcher is trusted. Verification step in phase 1.
- **Retry safety**: first attempt fails at FK insert → nothing persisted → retry is clean;
  upserts are idempotent regardless.

## Out of scope

- Zombie resurrection (late write after `user.deleted` recreates a minimal profile) —
  unchanged by this; already accepted limitation.
- `user.updated` ordering — unchanged; YAGNI for name/email.
- Removing the temporary `getCurrentUser` in `page.tsx` — separate effort.

## Minor cleanup (opportunistic)

- `src/app/api/webhooks/clerk/route.test.ts:15,21` mocks `ensureUserProfile`, which
  `route.ts` never imports. Dead mock — remove.

## Success criteria

- Steady-state writes (profile exists) issue **zero** extra DB round-trips — assert via
  test that `ensureUserProfile` is not called when the write succeeds.
- New-user race still self-heals: FK violation → ensure → retry succeeds — covered by test.
- Non-`userId` FK violation (e.g. missing `sourceId`) propagates unchanged — covered by test.
- `pnpm run typecheck && lint && test` green.

## Open questions

None.
