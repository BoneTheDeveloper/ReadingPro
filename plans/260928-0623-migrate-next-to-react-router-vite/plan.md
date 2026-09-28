---
title: "Migrate Next.js to React Router + Vite with Hono on Nitro"
description: "Replace Next.js 16 with a React Router v7 SPA (ssr: false, prerendered landing) built by Vite and a Hono API on Nitro, portable from Vercel to a long-running Node host, and remove Sentry."
status: pending
priority: P1
effort: 6d
branch: featrue/vite-refactor
tags: [refactor, frontend, backend, infra]
blockedBy: []
blocks: []
created: 2026-09-28
---

# Migrate Next.js to React Router + Vite with Hono on Nitro

## Overview

Next.js is slow in dev and its SSR adds complexity with no benefit. Only the
landing page needs SEO. Replace it with a React Router v7 SPA
(`ssr: false`, `prerender: ["/"]`) and move the 13 API routes onto a
Hono app served by Nitro. Nitro presets keep the same code deployable to Vercel
now and to a long-running Node host later (no serverless timeouts).

Sentry is removed entirely rather than ported: there is no capacity to
maintain it. Errors stay visible through pino logs on the server and
`console.error` on the client.

Decision record and comparison:
https://claude.ai/artifact/TeG85eSeZuBbSPDME5Spkd

## Contract

- **Outcome:** App builds and runs on React Router + Vite + Hono/Nitro with every
  current feature working: passage import (text, PDF, YouTube), study, AI chat
  streaming, vocabulary, flashcards/questions, Google sign-in. Sentry is gone.
- **Constraints:** Keep Prisma 7, better-auth, Workflow SDK, AI SDK, Redux,
  TanStack Query, Zod, pino, current CSP and security headers (minus Sentry origins). Node 24, pnpm.
  Vercel `sin1` stays the deploy target for now.
- **Non-goals:** No UI/UX changes, no DB schema changes, no rewrite of
  `src/features/*/server` or `src/workflows/*` logic. Moving production off
  Vercel (Postgres World, Docker hosting) is a later plan. No replacement error-tracking service.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Spike and Baseline](./phase-01-spike-and-baseline.md) | Pending |
| 2 | [Backend on Hono and Nitro](./phase-02-backend-hono-nitro.md) | Pending |
| 3 | [Frontend on React Router](./phase-03-frontend-react-router.md) | Pending |
| 4 | [Tooling Cleanup](./phase-04-tooling-cleanup.md) | Pending |
| 5 | [Deploy Verification](./phase-05-deploy-verification.md) | Pending |

Phases run in order. Phase 2 is verified against the existing Next frontend
through a dev rewrite, so the backend is proven before the frontend moves.

## Success Criteria

- [ ] `pnpm build`, `pnpm typecheck`, `pnpm lint` pass; no `next` dependency and no `next/*` import remain.
- [ ] No `@sentry/*` package, import, env var, or CSP origin remains (`git grep -i sentry` only matches plans and journals).
- [ ] Dev cold start and HMR are measurably faster than the Phase 1 baseline.
- [ ] `/` returns prerendered HTML; dashboard routes redirect to `/login` without a session.
- [ ] Google sign-in, expired session → toast + redirect, AI chat stream, both workflows reach COMPLETED on a Vercel preview.
- [ ] CSP and security headers present on HTML and API responses.
- [ ] `NITRO_PRESET=vercel` and `NITRO_PRESET=node-server` both build with no code change; the node-server output boots and serves `/` and `/api/passage`.

## Key Risks

- React Router framework mode and the Nitro Vite plugin may not share one Vite dev server. Phase 1 proves it or switches to the documented two-process fallback.
- `import "server-only"` throws outside the React Server Components bundler condition; all 16 imports must go before server code runs on Nitro.
- `better-auth` host and origin allowlists assume port 3000 and Next; wrong values break OAuth callbacks.
