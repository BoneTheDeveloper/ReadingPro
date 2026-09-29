---
phase: 5
title: "Hono-native handlers"
status: pending
priority: P2
effort: "5h"
dependencies: [4]
---

# Phase 5: Hono-native handlers

## Goal

Replace the Next.js-shaped `withErrorHandling` wrapper and per-handler
`requireApiSession` guard with Hono middleware, `zValidator`, `c.json()`, and a
single `app.onError`, without changing any request or response the client sees.

## Context

- `src/server/lib/error/with-error-handling.ts` wraps 19 handlers across 5 route files. It builds a pino child logger with `route`, `method`, `requestId` (from `x-request-id` or a new UUID), maps `ZodError` → 400 `VALIDATION` with `details: issues`, `AppError` → its own status/body (logs `info` if `< 500`, else `error` and returns a generic 500), anything else → generic 500.
- `session.ts` (`requireApiSession`) returns `{ ok: false, response }` with a 401 `UNAUTHORIZED` body; every handler narrows on it.
- Handlers read params via `await params`, bodies via `await req.json()` + `Schema.parse`/`safeParse`, and answer with `Response.json`.
- `ai-chat` returns a streaming `Response` from the AI SDK and uses a custom `VALIDATION` message on bad input.
- `/api/auth/*` is served by `auth.handler(c.req.raw)` and must stay outside the session middleware.

## Files to Create / Modify

- Create: `src/server/env.ts` — `AppEnv` type: `{ Variables: { user: SessionUser; session: Session; log: pino.Logger; requestId: string } }`
- Create: `src/server/middleware/request-context.ts` — sets `requestId` and `log` (child logger with `method`, `requestId`, and `route` = `c.req.routePath`)
- Create: `src/server/modules/auth/require-session.ts` — middleware; on no session throws `new AppError(401, "UNAUTHORIZED", "Authentication required")`, else sets `user`/`session`
- Create: `src/server/lib/error/on-error.ts` — `app.onError` handler with the same mapping and logging as the current wrapper, plus `HTTPException` → its status using the envelope
- Create: `src/server/lib/validate.ts` — thin `validate(target, schema, message?)` around `zValidator` whose hook returns the existing 400 `VALIDATION` envelope (`message` = first issue message or the override, `details` = issues)
- Modify: `src/server/app.ts` — `new Hono<AppEnv>()`, `use(requestContext)`, mount auth handler before session-protected modules, `onError(onError)`, chained `.route()` calls
- Modify: all five `*-routes.ts` files — `new Hono<AppEnv>().use(requireSession)`, `validate("param" | "json" | "query", ...)`, `c.var.user`, `c.req.valid(...)`, `c.json(...)`
- Delete: `src/server/lib/error/with-error-handling.ts`, `src/server/modules/auth/session.ts`
- Modify: `package.json` / `pnpm-lock.yaml` — add `@hono/zod-validator` (a version whose peer range covers `hono@4.13` and `zod@4`)

## Tasks & Steps

- [x] Before changing code, capture golden responses on `main`-equivalent code (end of Phase 4) for: unauthenticated GET `/api/passage`; POST `/api/passage` with an empty body; GET `/api/passage/not-a-uuid`; GET `/api/passage/<random-uuid>` (404); POST `/api/ai-chat` with `{}`; a forced 500 (temporarily throw in a service). Save status + body to `plans/260929-0238-src-boundary-restructure/reports/golden-errors.md`.
- [x] Add `@hono/zod-validator`; check its peer deps against installed `hono` and `zod`.
- [x] Write `env.ts`, `request-context.ts`, `require-session.ts`, `on-error.ts`, `validate.ts`. `on-error.ts` reuses `isAppError`, `internalErrorBody`, and `ERROR_CODES`; `ZodError` handling stays for `.parse()` calls inside services.
- [x] Rewrite `app.ts`: auth handler route first, then `requestContext`, then modules, then `onError`. Keep `basePath("/api")` and mount paths.
- [x] Convert route files one at a time, smallest first: `translate` → `vocabulary` → `passage` → `artifact` → `ai-chat`. After each, run `pnpm typecheck` and replay the golden requests for that route.
- [x] For `ai-chat`, pass the custom message (`"Invalid chat request. Select a passage and enter a message."`) to `validate`, and return the AI SDK stream `Response` directly.
- [x] Workflows still call services with plain arguments; confirm no service imports Hono: `git grep -ln 'from "hono' src/server/modules` lists only `*-routes.ts` files and `auth/require-session.ts`.
- [x] Delete `with-error-handling.ts` and `session.ts`.
- [x] Commit: `refactor: use hono middleware, validation and onError for api routes`.

## Verification

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `git grep -n "withErrorHandling\|requireApiSession\|Response.json" src/server/modules` returns nothing (streaming chat returns the SDK response, not `Response.json`).
- Replaying every golden request returns the same status and the same JSON body (`details` for validation may differ only if Zod issue paths change; they must not).
- Log lines for a request still include `route`, `method`, `requestId`, and `x-request-id` from the client is respected.
- Full smoke from the plan's success criteria, including sign-in (auth handler not blocked by session middleware) and session expiry → client toast + redirect to `/login`.

## Risk and Rollback

- Risk: `zValidator` param validation runs before the handler, so a bad UUID now fails in the validator instead of inside the handler. The body must still be `VALIDATION` 400; the golden check covers it.
- Risk: ordering mistake puts `requireSession` on `/auth/*`, breaking sign-in. Mitigation: session middleware is attached per module, never on the root app.
- Rollback: revert the phase commit; phases 1 to 4 stay valid on their own.
