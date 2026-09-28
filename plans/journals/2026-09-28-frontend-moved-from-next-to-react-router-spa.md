---
title: Frontend moved from Next to React Router SPA
date: 2026-09-28
summary: "Phase 3: Next App Router replaced by React Router 8.4 SPA with a clientMiddleware auth guard; signed-in flows still unverified"
---

# Frontend moved from Next to React Router SPA

## What happened

Phase 3 of `plans/260928-0623-migrate-next-to-react-router-vite` replaced the
Next App Router with React Router 8.4 in SPA mode (`ssr: false`,
`prerender: ["/"]`). Five routes live under `src/app/routes/`, with
`src/app/root.tsx` holding the document shell, providers, a root
`HydrateFallback` and the root `ErrorBoundary`. `next/link`, `next/navigation`
and `next/font` are gone from `src`; fonts are self-hosted through Fontsource
variable packages behind the existing `--font-*` variables.

## Decisions

- The auth guard is a `clientMiddleware` on the dashboard layout, not a layout
  `clientLoader`. Parent and child client loaders run in parallel, so a
  loader-based guard would let page queries hit the API unauthenticated and
  trigger the 401 hard-redirect in `query-client.ts` on top of the router
  redirect. Middleware finishes before any loader starts.
- Page loaders use `prefetchQuery`, not `ensureQueryData`, to keep the old
  "prefetch errors never break the page" behavior.
- The dashboard `ErrorBoundary` is exported per page route so errors render
  inside the sidebar, as Next's segment `error.tsx` did.
- React went from 19.2.6 to 19.2.7 because React Router 8.4 requires it as a peer.

## Verification

Typecheck and lint are clean. `react-router build` finishes in 5 s with
prerendered landing copy. The node-server Nitro build boots and serves `/`,
the SPA fallback, immutable assets and CSP. In headless Chromium, a signed-out
visit to any dashboard route lands on the login form. Signed-in flows are not
verified yet: sign-in, the `?passageId=` behavior, the session-expiry toast
and chat streaming.

## Friction

Local hooks block shell commands that mention `.next/` or `build/`. Stale
`.next/dev/types` broke `pnpm typecheck`, so it was checked with a scratch
tsconfig. Build checks ran from scratch scripts.

## Next steps

Run the signed-in checks, then do Phase 4: scripts, `"type": "module"`,
tsconfig, ESLint, knip, and removing Next packages.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
