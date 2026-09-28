---
phase: 2
title: "Backend on Hono and Nitro"
status: pending
priority: P1
effort: "2d"
dependencies: [1]
---

# Phase 2: Backend on Hono and Nitro

## Goal

Remove Sentry, then serve all 13 API routes, better-auth, workflows, and
security headers from a Hono app on Nitro, with handler bodies unchanged, and
prove it by running the existing Next frontend against it.

## Key Insights

- Business logic in `src/features/*/server/service` and `src/workflows/*` has
  no `next/*` imports. It moves unchanged.
- `src/lib/auth/session.ts` reads headers through `next/headers` and redirects
  through `next/navigation`. This is the only real coupling in the auth path.
- `import "server-only"` (16 files) throws when imported without the
  `react-server` export condition, which Nitro does not set. Every import must
  be removed, not kept "just in case".
- `withErrorHandling` already speaks `Request`/`Response`. Only
  `unstable_rethrow` and the `@sentry/nextjs` import are Next-specific.
- Sentry touches 8 files: `next.config.ts` (`withSentryConfig`, tunnel
  `/monitoring`, `*.sentry.io` in CSP), `src/instrumentation.ts`,
  `src/instrumentation-client.ts`, `src/sentry.server.config.ts`,
  `src/sentry.edge.config.ts`, `src/lib/error/with-error-handling.ts`,
  `src/app/(dashboard)/error.tsx`, `src/app/global-error.tsx`. Removing it first
  means no ported code carries Sentry calls. `withErrorHandling` already logs
  every 500 through pino, so no server error goes silent.
- Route params arrive as `ctx.params` (a Promise). Hono gives
  `c.req.param()`; the wrapper can build the same shape so handlers stay unchanged.
- `src/proxy.ts` matches `/dashboard/:path*`, which no URL uses; it protects nothing
  today. It is deleted in Phase 4, and nothing replaces it server-side
  (API routes keep `requireApiSession`).

## Architecture

```
src/server/
  app.ts                 Hono app: mounts auth + feature routers, security headers
  routes/passage.ts      GET/POST /api/passage, GET/DELETE /api/passage/:id
  routes/artifact.ts     /api/artifact, /:id, /:id/progress, /flashcard, /question
  routes/vocabulary.ts   /api/vocabulary, /:id, /stats
  routes/translate.ts    POST /api/translate
  routes/ai-chat.ts      GET/POST/DELETE /api/ai-chat
nitro.config.ts or vite.config.ts   (per Phase 1 decision) routes "/api/**" → src/server/app.ts
```

Handler adapter in `src/lib/error/with-error-handling.ts`:

```ts
// Hono handler: (c) => handler(c.req.raw, { params: Promise.resolve(c.req.param()), log })
```

## Tasks & Steps

1. **Remove Sentry** (own commit, `chore: remove sentry`):
   - `pnpm remove @sentry/nextjs`; drop `"@sentry/cli": false` from `pnpm-workspace.yaml` `allowBuilds`.
   - `next.config.ts`: export `withWorkflow(nextConfig)` without `withSentryConfig`; remove `https://*.sentry.io` from `connect-src`.
   - Delete `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`.
   - `with-error-handling.ts`: delete the two `Sentry.captureException` calls; the `logger.error` lines stay.
   - `error.tsx`, `global-error.tsx`: replace `Sentry.captureException(error)` with `console.error(error)`.
   - `README.md`: change "Sentry · pino" to "pino" in the stack list.
   - Verify: `pnpm typecheck && pnpm build` on Next; trigger a 500 and see it in the pino log.
2. Add deps: `hono`, `nitro`. Keep `next` until Phase 4.
3. Remove `import "server-only"` from all 16 files
   (`grep -rl 'import "server-only"' src`).
4. Refactor `src/lib/auth/session.ts`:
   - `getSession(headers: Headers)` calls `auth.api.getSession({ headers })`; drop React `cache`.
   - `requireApiSession(req: Request)` passes `req.headers`.
   - Delete `requirePageSession` in Phase 3 once no page uses it (keep until then for the running Next frontend).
   - Update all 13 route call sites from `requireApiSession()` to `requireApiSession(req)`.
5. Refactor `withErrorHandling`: drop `unstable_rethrow`; export a Hono-facing wrapper that builds `{ params, log }`
   from the Hono context and calls the existing handler signature.
6. Create `src/server/routes/*.ts` and move each handler body from
   `src/app/api/**/route.ts` unchanged. Replace `NextResponse` in `ai-chat` with
   `Response`. Keep `toUIMessageStreamResponse()` as the returned Response.
7. Mount better-auth: `app.on(["GET","POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))`.
8. Update `src/lib/auth/auth.ts`: add the Nitro dev origin (port from Phase 1)
   to `baseURL.allowedHosts` and `trustedOrigins`; keep `*.vercel.app` rules
   and the `oAuthProxy` plugin unchanged.
9. Port CSP and security headers from `next.config.ts` into one module
   (`src/server/security-headers.ts`) and apply them through Nitro
   `routeRules` for `/**` so static assets and API share them.
10. Workflows: register via the Phase 1 mechanism (`workflow/nitro` module or
    `workflow()` Vite plugin). `start()` calls in routes stay unchanged.
11. Temporary bridge: add a dev-only rewrite in `next.config.ts`
    (`/api/:path*` → Nitro dev URL) and remove `src/app/api/**` so the Next
    frontend exercises the new backend.
12. Run the app end to end through the Next frontend (see Verification).

## Files

- Create: `src/server/app.ts`, `src/server/routes/{passage,artifact,vocabulary,translate,ai-chat}.ts`, `src/server/security-headers.ts`, `nitro.config.ts` (if layout B)
- Modify: `src/lib/auth/session.ts`, `src/lib/auth/auth.ts`, `src/lib/error/with-error-handling.ts`, `src/app/(dashboard)/error.tsx`, `src/app/global-error.tsx`, 16 files importing `server-only`, `next.config.ts` (Sentry removal, temporary rewrite), `package.json`, `pnpm-workspace.yaml`, `README.md`
- Delete: `src/app/api/**` (13 `route.ts`), `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`

## Todo

- [ ] Sentry removed: package, 4 config files, CSP origin, tunnel, calls
- [ ] `server-only` imports removed (0 matches)
- [ ] `session.ts` takes headers explicitly; 13 call sites updated
- [ ] `withErrorHandling` free of `next/*`
- [ ] 13 routes ported to Hono routers with unchanged bodies
- [ ] better-auth mounted at `/api/auth/*`, origins updated
- [ ] Security headers via `routeRules`
- [ ] Next frontend works end to end against Nitro via dev rewrite

## Verification

- `pnpm typecheck` passes.
- `curl -i localhost:<nitro>/api/passage` without cookie → 401 JSON envelope `{ error: { code: "UNAUTHORIZED" } }` and CSP header present.
- Through the Next frontend: Google sign-in completes; create a text passage and a YouTube passage and see both reach COMPLETED; generate a flashcard and a question artifact; AI chat streams token by token and history persists after reload; save and delete a vocabulary item; translate a selection.
- A thrown test error inside a handler returns the 500 envelope and appears in the pino log with `route` and `requestId`.
- `git grep -i sentry -- src next.config.ts package.json` returns nothing.

## Risks

- OAuth callback lands on the wrong host → check `allowedHosts`, `trustedOrigins`, and Google console redirect URIs for the dev port before testing sign-in.
- AI chat stream buffered by a proxy layer → verify chunks arrive incrementally in the browser network tab.
- `onFinish` persistence after the response ends may be cut on Vercel Functions; this matches current behavior on Next and is not changed here.

## Security

- Every ported route keeps its `requireApiSession(req)` guard as its first statement; review the diff for any route that lost it.
- Header redaction in `src/lib/logger.ts` stays unchanged.

## Rollback

Revert the phase commits; `src/app/api/**` and `next.config.ts` return, and Next serves the API again.
