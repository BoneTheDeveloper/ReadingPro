---
title: "Lazy UserProfile Ensure via Optimistic FK-Catch"
date: "2026-06-18"
source: "ck:cook"
plan: "plans/260618-1432-lazy-ensure-user-profile/plan.md"
---

# Lazy UserProfile Ensure via Optimistic FK-Catch

## Context

The prior auth-perf refactor (plan 260618-1121) added `ensureUserProfile(userId)` as a
pre-emptive `upsert` before every FK-creating write, to cover the window where a brand-new
user writes before the Clerk webhook syncs their `UserProfile`. Problem: that upsert ran on
*every* write *forever* — including the very hot translation cache/history paths — to insure
a race that only lasts minutes, once per user. The refactor that removed per-request Clerk
calls had quietly reintroduced a per-write DB round-trip.

## What Happened

- Added `withUserProfile(userId, write)` + `isMissingUserProfileFk(e)` to `sync-user.ts`.
  The wrapper runs the write optimistically (zero extra round-trips when the profile exists)
  and only on a missing-`UserProfile` FK creates the row and retries once.
- Matcher is scoped to the `userId` FK (`P2003` on a `*_userId_fkey` constraint). Captured
  the **real** Prisma 7.8 + `@prisma/adapter-pg` `P2003` payload from the live DB rather
  than guessing — the constraint name lives at
  `meta.driverAdapterError.cause.constraint.index`. A `*_sourceId_fkey` failure (a real bug)
  still propagates.
- Migrated 10 call sites across translation, vocabulary, vocabulary-set, study-session,
  passage-create, and the perf test fixture. For multi-write functions, wrapped only the
  first `userId`-FK write so a retry never double-executes secondary writes. Wrapped
  `ensureActiveSession`'s whole `$transaction` so an FK rollback retries the atomic block.
- Added a heal-path `log.warn` so a persistently hot heal path (i.e. a broken/lagging
  webhook) is visible instead of silent.
- Removed a dead `ensureUserProfile` mock from the Clerk webhook test; updated
  auth-architecture, auth-flow, and prisma SECURITY docs.

## Decisions

- **Optimistic FK-catch over pre-emptive ensure or webhook-only.** Pre-emptive taxes the hot
  path forever; webhook-only would 500 a new user's first API write. FK-catch pays the cost
  only in the race window and keeps a safety net.
- **Wrap the FK-bearing write, not the whole function.** Keeps retries clean for non-atomic
  multi-write functions; matches the `$transaction` granularity for the one transactional
  caller.
- **Real-payload hard gate.** A red-team flagged that if the matcher silently never matched
  the real `P2003`, the race would go unhealed and every new user would 500 — worse than the
  bug being removed. So matcher correctness was gated on a live-captured payload, not a mock.

## Reflection

The interesting bug here was one step away from where the original plan pointed: the
"fallback" wasn't wrong, its *placement* (before every write) was. Verifying the Prisma error
shape against the real driver adapter mattered — the constraint name is nested deeper than
the classic `meta.field_name`, so a guessed matcher would have compiled, passed a hand-mock,
and quietly failed in production. Security review confirmed no new exposure: `userId` is
always auth-derived (`getUserId()`, spread last over the body), so the wrapper can only ever
ensure the caller's own profile.

Full suite green (365 tests), typecheck + lint clean. Net result: steady-state writes drop
from +1 upsert to zero extra round-trips.
