---
phase: 3
title: "Frontend on React Router"
status: pending
priority: P1
effort: "1.5d"
dependencies: [2]
---

# Phase 3: Frontend on React Router

## Goal

Replace the Next App Router with React Router v8 framework mode
(`ssr: false`, `prerender: ["/"]`), keeping every screen and interaction the same.

## Key Insights

- 5 pages: `/` (marketing), `/login`, `/study`, `/vocabulary`, `/account`.
- `/study` and `/vocabulary` prefetch on the server with `HydrationBoundary`.
  The query options already carry client `queryFn`s via `fetchJson`
  (`src/features/passage/api/queries.ts`), so `clientLoader` +
  `queryClient.ensureQueryData(...)` gives the same warm cache.
- The dashboard layout seeds Redux with the session user. A `clientLoader`
  can fetch the session once and pass it the same way.
- Next-specific client imports: `next/link` (4), `next/navigation` (6),
  `next/font/google` (1). Sentry is already gone after Phase 2.
- `src/lib/query-client.ts` handles 401 on the client already; it keeps working.

## Architecture

```
react-router.config.ts     { appDirectory: "src/app", ssr: false, prerender: ["/"] }
src/app/root.tsx           <html lang="vi">, fonts, Providers, ErrorBoundary (global-error)
src/app/routes.ts          route config (below)
src/app/routes/
  marketing.tsx            "/"            (prerendered)
  login.tsx                "/login"       clientLoader: session → redirect("/study")
  dashboard-layout.tsx     layout         clientLoader: no session → redirect("/login"); StoreProvider; ErrorBoundary
  study.tsx                "/study"       clientLoader: ensureQueryData(passageQueries.list())
  vocabulary.tsx           "/vocabulary"  clientLoader: ensureQueryData(list + stats)
  account.tsx              "/account"     reads user from Redux
```

## Tasks & Steps

1. Add deps: `react-router`, `@react-router/dev`, `vite`, `@tailwindcss/vite`, `@fontsource-variable/plus-jakarta-sans`, `@fontsource/lora`, `@fontsource-variable/jetbrains-mono` (self-hosted fonts keep CSP `font-src 'self'` sufficient).
2. Create `react-router.config.ts` and `vite.config.ts` from the Phase 1 spike
   report: `vite.config.ts` holds only `tailwindcss()` and `reactRouter()`, plus
   `server.proxy["/api"]` → `http://localhost:3001` (Nitro dev). No Nitro plugin.
   Move Tailwind from `postcss.config.mjs` to `@tailwindcss/vite`.
3. `root.tsx`: port `src/app/layout.tsx`. Keep CSS variable names
   `--font-jakarta`, `--font-lora`, `--font-jetbrains-mono` in `globals.css`,
   pointing at the Fontsource families, so no component class changes.
4. Port pages into `src/app/routes/*` keeping their child components:
   - marketing: remove the `next/link` import, use React Router `Link`.
   - login: `clientLoader` calls `authClient.getSession()`; redirect when signed in.
   - dashboard layout: `clientLoader` returns the session user or throws
     `redirect("/login")`; render `StoreProvider user={...}` + `DashboardSidebar` + `<Outlet />`.
   - study / vocabulary: `clientLoader` runs `ensureQueryData` with the
     existing query options; render the existing client components directly (no
     `HydrationBoundary`).
   - account: read `name`/`email` from `selectSessionUser` instead of a server session.
5. Replace Next client APIs:
   - `src/component/layout/dashboard-sidebar.tsx`: `Link`, `useLocation().pathname`.
   - `src/component/layout/auth-controls.tsx`: `Link`, `useNavigate()`.
   - `src/features/passage/hook/use-passage-library.ts`: `useSearchParams` from
     React Router (returns `[params, setParams]`); keep the `?passageId=` contract.
   - Any `router.push/replace` → `navigate(to, { replace })`.
6. Error boundaries: move `src/app/(dashboard)/error.tsx` and
   `src/app/global-error.tsx` into route `ErrorBoundary` exports; use
   `useRouteError()`, `console.error`, and a "Thử lại" button
   that calls `navigate(0)` or revalidates.
7. Delete `requirePageSession` from `session.ts` and the old
   `src/app/(auth)`, `(dashboard)`, `(marketing)`, `layout.tsx`, `provider.tsx`
   (moved), `global-error.tsx`.
8. Remove the temporary `next.config.ts` rewrite from Phase 2.

## Files

- Create: `react-router.config.ts`, `vite.config.ts`, `src/app/root.tsx`, `src/app/routes.ts`, `src/app/routes/{marketing,login,dashboard-layout,study,vocabulary,account}.tsx`
- Modify: `src/app/globals.css`, `src/component/layout/dashboard-sidebar.tsx`, `src/component/layout/auth-controls.tsx`, `src/features/passage/hook/use-passage-library.ts`, `src/lib/auth/session.ts`, `src/app/(dashboard)/study/_component/*` and `_hook/*` (move under routes folder or `src/features/studio`)
- Delete: `src/app/layout.tsx`, `src/app/(auth)/**`, `src/app/(dashboard)/**` (after moving `_component`/`_hook`), `src/app/(marketing)/**`, `src/app/global-error.tsx`, `postcss.config.mjs`

## Todo

- [ ] Vite + React Router config in place, Tailwind via Vite plugin
- [ ] Root layout with self-hosted fonts and providers
- [ ] 5 routes ported; auth guard in dashboard layout `clientLoader`
- [ ] `next/link`, `next/navigation`, `next/font` fully replaced
- [ ] Error boundaries ported to route `ErrorBoundary` exports
- [ ] Old Next app files deleted

## Verification

- `grep -rE "from ['\"]next" src` returns nothing.
- `pnpm dev`: visit `/study` signed out → lands on `/login`; sign in → `/study`.
- `/study?passageId=<id>` reload reopens the same passage; deleting it clears the param.
- Let a session expire (delete the session row) → next query shows the toast flow and redirects to `/login` once.
- Build output contains `build/client/index.html` with the marketing copy ("Tóm tắt văn bản") in the raw HTML.
- Visual check of all 5 pages against the Next version: fonts, sidebar, dark/light states unchanged.

## Risks

- Brief blank frame on dashboard load while `clientLoader` fetches the session → add `HydrateFallback` with the existing loading skeleton.
- AI chat stream buffered by the Vite dev proxy → check chunks arrive incrementally in the network tab.
- `useSearchParams` semantics differ (setter vs `router.replace`) → keep the existing update helper and swap only its implementation.

## Rollback

Revert the phase commits; the Next frontend with the Phase 2 rewrite returns.
