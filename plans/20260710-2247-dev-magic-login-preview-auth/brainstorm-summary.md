# Brainstorm Summary — Dev Magic-Login for Preview-Browser Auth

**Date:** 2026-07-10
**Status:** Approved (Option A) → handoff to /ck:plan

## Problem Statement

Enable Claude Code's **built-in preview browser** to browse the app's
authenticated pages without hand-typing a login each session. User pasted a
Better Auth `testUtils` cookie-injection template (Playwright-style
`context.addCookies`) as the desired mechanism.

## Key Discovery / Constraint

- Better Auth **1.6.23** ships `better-auth/plugins` → `testUtils`
  (`test.createUser` / `saveUser` / `login` / `getCookies`). User's template is
  real (tweaks: `createUser` is sync; cookies via `getCookies({userId})`).
- Better Auth session cookie is **httpOnly**. The preview tool exposes only
  `preview_eval` (in-page JS), which **cannot set httpOnly cookies**. The
  Playwright `addCookies` (CDP context-level) path is **unavailable** in the
  built-in preview tooling.
- ⇒ The **server** must set the cookie, not the browser.

## Evaluated Approaches

| Option | Summary | Verdict |
|---|---|---|
| **A. Dev magic-login route** | Guarded `/api/dev/login` mints session server-side, returns httpOnly `Set-Cookie`. Uses `testUtils` via test-only auth instance. | **CHOSEN** |
| B. Seed user + drive real form | Safest (no standing bypass); fills real sign-in form each session. | Fallback |
| C. True CDP `addCookies` | User's literal template. Not supported by preview tools. | Rejected (unsupported) |

## Chosen Solution — Option A

Same-process design: the dev route runs inside the Next process serving the
preview (same `BETTER_AUTH_SECRET` + same dev DB) → session minted by
`auth.test.ts` is inherently valid for production `auth` (DB-backed + shared
secret). No cross-process signing pitfalls.

**Runtime flow (preview tools):**
1. `preview_start`.
2. `preview_eval`: `location.href='/api/dev/login?email=e2e@example.com&tier=PREMIUM'`.
3. Route: find-or-create user (idempotent) → `test.saveUser` →
   `test.login({userId})` → forward `Set-Cookie` on redirect to `/`.
4. Navigate to any protected page → already authenticated.

**Components:**
- `src/lib/auth/auth-options.ts` — extract shared `BetterAuthOptions`, **no
  `server-only`** (both instances import → no config/cookie drift).
- `src/lib/auth/auth.ts` — `betterAuth(authOptions)` (behavior unchanged).
- `src/lib/auth/auth.test.ts` — `betterAuth({...authOptions, plugins:[testUtils()]})`.
  No `server-only`; never imported by app runtime code.
- `src/app/api/dev/login/route.ts` — guarded endpoint; `email` + `tier` query params.

**Security gating (non-negotiable — route is a full auth bypass):**
- `NODE_ENV === "production"` → 404.
- AND require `DEV_LOGIN_ENABLED === "true"` (off by default; opt-in via `.env.local`).
- Accepted trade-off: `testUtils` code exists in bundle but route is inert under double guard (consequence of reusing dev DB).

## Constraints / Decisions (from user)

- Runner context: Claude Code built-in preview browser (not CI/Playwright).
- DB: **reuse dev DB** (idempotent find-or-create avoids row spam).
- Auth instance: **separate `auth.test.ts`** (keep production auth clean of testUtils).

## Risks

- Dev-DB pollution → mitigated by idempotent user lookup.
- `auth-options.ts` extraction lightly touches production `auth.ts` (behavior-preserving; verify `getSession` still works).
- Guard correctness must be verified before first use.

## Success Criteria

- With `DEV_LOGIN_ENABLED=true` (dev), navigating to `/api/dev/login?email=…`
  redirects to `/` authenticated; protected pages render logged-in state.
- Production build: route returns 404; `typecheck` + `lint` pass.
- Production `auth.ts` behavior unchanged.

## Open Questions

- None blocking. Tier values to support beyond FREE/PREMIUM? (default: pass-through to `additionalFields.tier`).
