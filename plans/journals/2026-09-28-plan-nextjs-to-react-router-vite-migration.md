---
title: Plan Next.js to React Router + Vite migration
date: 2026-09-28
summary: Chose React Router v7 SPA + Hono on Nitro over staying on Next or TanStack Start; 5-phase plan written
---

# Plan Next.js to React Router + Vite migration

## What happened
Brainstormed leaving Next.js 16 for Vite + React. Next is slow in dev, and its SSR adds complexity without benefit. Only the landing page needs SEO. Wrote plan `plans/260928-0623-migrate-next-to-react-router-vite` (5 phases, 29 tasks).

## Findings from the code
- `src/proxy.ts` matches `/dashboard/:path*`, but `(dashboard)` is a route group, so it protects no real URL. The real guard is `requirePageSession()` in the dashboard layout.
- 16 files `import "server-only"`. That module throws without the `react-server` export condition, so it breaks under Nitro and must be removed.
- `src/lib/auth/session.ts` is the only auth coupling to Next (`next/headers`, `redirect`). Feature services and workflows are framework-free.

## Decision
- React Router v7 framework mode, `ssr: false`, `prerender: ["/"]`.
- 13 API routes move to Hono on Nitro, with handler bodies unchanged.
- Deploy to Vercel now (`NITRO_PRESET=vercel`). Later, move to a long-running Node host (`node-server` + `@workflow/world-postgres`) to avoid serverless timeouts. Postgres World is not compatible with Vercel.
- Rejected TanStack Start (SSR not needed) and staying on Next (the dev-performance and SSR-complexity pain is real).

## Next steps
Phase 1 spike: record the Next dev baseline, then prove whether `reactRouter()`, `nitro()` and `workflow()` can share one Vite config. If they cannot, fall back to two processes.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
