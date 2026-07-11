---
title: "Dev Magic-Login for Preview-Browser Auth"
status: pending
scope: project
created: 2026-07-10
source: brainstorm-summary.md
blockedBy: []
blocks: []
---

# Dev Magic-Login for Preview-Browser Auth

Let Claude Code's built-in preview browser reach authenticated pages by
navigating once to a guarded dev route that mints a Better Auth session
server-side (httpOnly `Set-Cookie`). Uses Better Auth 1.6.23 `testUtils`.

**Why a route, not `context.addCookies`:** Better Auth session cookies are
httpOnly; the preview tool only runs in-page JS, which cannot set httpOnly
cookies. The server must set the cookie. Same-process minting (route runs inside
the app) → shared secret + DB → session is inherently valid.

Full context: [brainstorm-summary.md](brainstorm-summary.md)

## Phases

| # | Phase | Status | Blocks on |
|---|-------|--------|-----------|
| 1 | [Auth options extraction + test instance](phase-01-auth-instance-extraction.md) | pending | — |
| 2 | [Guarded dev magic-login route](phase-02-dev-login-route.md) | pending | 1 |
| 3 | [Verify in preview browser](phase-03-verify-preview.md) | pending | 2 |

## Key Decisions (locked in brainstorm)

- Approach **A** (dev magic-login route). testUtils via **separate `auth.test.ts`**.
- **Reuse dev DB** → idempotent find-or-create user (avoids row spam).
- Double security guard: `NODE_ENV !== "production"` **AND** `DEV_LOGIN_ENABLED === "true"`.
- Production `auth.ts` behavior must stay unchanged.

## Files

- Create: `src/lib/auth/auth-options.ts`, `src/lib/auth/auth.test.ts`, `src/app/api/dev/login/route.ts`
- Modify: `src/lib/auth/auth.ts`, `.env.example`
- Docs: note dev-login usage in `docs/` if an auth/dev section exists

## Success Criteria

- Dev + `DEV_LOGIN_ENABLED=true`: navigating `/api/dev/login?email=e2e@example.com&tier=PREMIUM`
  redirects to `/` authenticated; a protected page renders logged-in.
- Guard off / prod: route returns 404.
- `pnpm run typecheck` + `pnpm run lint` pass; `getSession()` unchanged.

## Dependencies

- No new packages (`better-auth` `testUtils` already shipped in 1.6.23).
