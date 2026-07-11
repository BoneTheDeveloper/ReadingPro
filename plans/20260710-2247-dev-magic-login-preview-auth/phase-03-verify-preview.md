---
phase: 3
title: "Verify auth injection in preview browser"
status: pending
priority: P1
effort: "0.5h"
dependencies: [2]
---

# Phase 3: Verify auth injection in preview browser

## Overview
Prove the end-to-end loop: static checks pass, the guarded route logs the preview
browser in, a protected page renders authenticated, and the guard blocks access
when disabled.

## Requirements
- Functional: preview browser is authenticated after one navigation to the route.
- Non-functional: no regression to existing auth; guard verifiably closed by default.

## Architecture
Uses the built-in preview tooling (`preview_start` + `preview_eval` navigation).
`DEV_LOGIN_ENABLED=true` must be present in the dev server's env (e.g. `.env.local`)
for the run — the server process reads it, not the browser.

## Related Code Files
- None (verification only). May touch `.env.local` (not committed).

## Implementation Steps

1. **Static:** `pnpm run typecheck` && `pnpm run lint` → clean.
2. **Guard-closed check (do first):** with `DEV_LOGIN_ENABLED` unset, start dev,
   navigate to `/api/dev/login` → expect **404** (proves default-closed).
3. **Enable:** set `DEV_LOGIN_ENABLED=true` in `.env.local`, restart dev server.
4. **Login loop (preview tools):**
   - `preview_start`.
   - `preview_eval`: `location.href = '/api/dev/login?email=e2e@example.com&tier=PREMIUM'`.
   - After redirect, `preview_eval`: `location.href = '<a protected route>'`.
   - `preview_snapshot` → confirm logged-in UI (e.g. account controls show the
     user, not a sign-in link). Cross-check `auth-controls.tsx` output.
5. **Session sanity:** optionally hit an endpoint that calls `getSession()` and
   confirm it returns the user (proves production `auth` accepts the test-minted
   cookie — the shared-secret/DB assumption).
6. **DB check:** confirm exactly one `e2e@example.com` user row after repeated
   logins (idempotency holds).

## Success Criteria
- [ ] typecheck + lint clean.
- [ ] Guard off → 404; guard on → redirect + authenticated page.
- [ ] Protected page renders logged-in state in the preview browser.
- [ ] Repeated logins do not create duplicate users.
- [ ] Existing sign-in/out flow unaffected (spot check).

## Risk Assessment
- **httpOnly cookie not persisting across `preview_eval` navigations** → confirm
  the preview browser keeps a normal cookie jar; if the redirect drops the cookie,
  navigate directly to the protected route after the route sets it (single hop).
- **`getSetCookie()` fallback** (from Phase 2) — if triggered, re-verify cookie
  attributes (path=/, correct domain for localhost) so the browser sends it back.
