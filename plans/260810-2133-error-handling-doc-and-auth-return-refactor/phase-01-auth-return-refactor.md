---
phase: 1
title: "Auth Return Refactor"
status: todo
priority: P2
effort: "1.5h"
dependencies: []
---

# Phase 1: Auth Return Refactor

## Overview

Convert `requireApiSession()` from throw-based to a discriminated union so that
an unhandled 401 becomes a TypeScript compile error instead of relying on
`withErrorHandling` to catch it. Behavior over the wire must not change.

## Requirements

**Functional (must be identical before and after):**
- Unauthenticated API request still returns HTTP `401`
- Response body still `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`
- Still logged at `info` level, still **not** sent to Sentry

**Non-functional:**
- Accessing `user` without narrowing must not compile
- No change to `requirePageSession()` — pages keep `redirect()`
- No change to Zod parsing or service-layer `throw AppError`

## Architecture

### Before

```ts
// src/lib/auth/session.ts
export async function requireApiSession() {
  const session = await getSession();
  if (!session) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  return session;                    // TS: always Session. Failure path invisible.
}
```

The 401 exists only at runtime. `withErrorHandling` must catch it, or Next.js
converts it to a bare bodyless 500.

### After

```ts
// src/lib/auth/session.ts
type ApiSession = Awaited<ReturnType<typeof getSession>>;

export type SessionGuard =
  | { ok: true; session: NonNullable<ApiSession> }
  | { ok: false; response: Response };

export async function requireApiSession(): Promise<SessionGuard> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      ).toResponse(),
    };
  }
  return { ok: true, session };
}
```

`ok` is the discriminant. `session` does not exist on the `ok: false` branch, so
the narrowing check is mandatory to compile.

Reusing `AppError(...).toResponse()` rather than hand-building `Response.json`
keeps the envelope in exactly one place — `toBody()` at
[`app-error.ts:37`](../../src/lib/error/app-error.ts).

### Call-site transformation

Two existing shapes, one target shape.

Shape A — 15 sites:
```ts
const { user } = await requireApiSession();
// →
const auth = await requireApiSession();
if (!auth.ok) return auth.response;
const { user } = auth.session;
```

Shape B — 3 sites, all in `ai-chat/route.ts`:
```ts
const session = await requireApiSession();
const userId = session.user.id;
// →
const auth = await requireApiSession();
if (!auth.ok) return auth.response;
const userId = auth.session.user.id;
```

## Related Code Files

**Modify — guard definition:**
- `src/lib/auth/session.ts` — `requireApiSession` only. Leave `getSession` and `requirePageSession` untouched.

**Modify — 18 call sites across 11 route files:**

| File | Sites | Shape |
|------|-------|-------|
| `src/app/api/ai-chat/route.ts` | 3 (L20, L64, L81) | B |
| `src/app/api/vocabulary/route.ts` | 2 (L10, L15) | A |
| `src/app/api/vocabulary/[id]/route.ts` | 2 (L15, L26) | A |
| `src/app/api/vocabulary/stats/route.ts` | 1 (L6) | A |
| `src/app/api/passage/route.ts` | 2 (L11, L20) | A |
| `src/app/api/passage/[id]/route.ts` | 2 (L9, L20) | A |
| `src/app/api/artifact/route.ts` | 1 (L7) | A |
| `src/app/api/artifact/[id]/route.ts` | 2 (L7, L14) | A |
| `src/app/api/artifact/[id]/progress/route.ts` | 1 (L14) | A |
| `src/app/api/artifact/question/route.ts` | 1 (L18) | A |
| `src/app/api/artifact/flashcard/route.ts` | 1 (L17) | A |

**Do not modify:**
- `src/lib/error/with-error-handling.ts` — still needed for Zod, service `AppError`, and unexpected throws
- `src/lib/error/app-error.ts`
- Any `server/service/` file
- `src/proxy.ts` — separate issue

## Implementation Steps

1. Rewrite `requireApiSession` in `src/lib/auth/session.ts` per the Architecture
   section. Export `SessionGuard`.
2. Run `pnpm typecheck`. Expect ~18 errors — this is the compile-enforcement
   working. The error list is the authoritative worklist for step 3.
3. Fix each call site. Work file by file in the table order; do not batch-sed —
   `ai-chat` uses shape B and the surrounding code differs.
4. Confirm `ai-chat` streaming handlers still return their stream response on the
   success path; the guard only short-circuits the failure path.
5. `pnpm typecheck` → clean.
6. `pnpm lint` and `pnpm knip`. `knip` may flag `SessionGuard` if only used
   internally — if so, drop the `export` rather than adding an ignore rule.

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm knip
```

**Compile-enforcement spot check** (the actual point of this phase):
temporarily delete the `if (!auth.ok) return auth.response;` line in
`src/app/api/vocabulary/route.ts`, run `pnpm typecheck`, confirm it **fails**,
then restore.

**Runtime parity check** — with no session cookie:
```bash
curl -i http://localhost:3000/api/vocabulary
```
Expect `401` and `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`.
Confirm the server log line is `info`, not `error`.

## Success Criteria

- [ ] `requireApiSession` contains no `throw`
- [ ] All 18 sites narrow before touching `session`
- [ ] Deleting a guard line fails `pnpm typecheck` (verified, then reverted)
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm knip` pass
- [ ] Unauthenticated request: identical status, body, and log level as before
- [ ] `requirePageSession` and all `server/service/` files unchanged

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Missed call site | Low | `typecheck` cannot miss one — that is the mechanism |
| `ai-chat` streaming path broken by early return | Medium | Shape B differs; hand-edit those 3 sites, verify a real chat round-trip |
| Message/status drift | Low | Reuse `AppError(...).toResponse()`; do not hand-build the envelope |
| Verbosity pushback | Medium | +1 line × 18. If rejected, revert is a clean single-commit undo |

**Rollback:** single commit, no schema/API contract change. `git revert` is safe
and complete. Phase 2 must not land before this is accepted.
