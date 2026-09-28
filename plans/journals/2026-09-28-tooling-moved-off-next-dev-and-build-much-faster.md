---
title: Tooling moved off Next; dev and build much faster
date: 2026-09-28
summary: "Phase 4: Next packages and configs removed, scripts/tsconfig/ESLint/knip moved to React Router + Nitro; cold dev 17 s to 3.8 s, build 36 s to 7.8 s"
---

# Tooling moved off Next; dev and build much faster

## What happened

Phase 4 of `plans/260928-0623-migrate-next-to-react-router-vite` removed
`next`, `eslint-config-next`, `server-only` and `@tailwindcss/postcss`. It also
deleted `next.config.ts`, `next-env.d.ts`, the `workflow/next` generated routes
and the `.swc` cache. `package.json` now has `"type": "module"`.

- `dev` runs `nitro dev` and `react-router dev` under `concurrently`.
- `build` runs `react-router build && nitro build`.
- `start` runs `node --env-file-if-exists=.env .output/server/index.mjs`, so a
  local production boot has its secrets. Without them, better-auth threw
  "default secret" and every API call returned 500.
- `typecheck` runs typegen first.
- ESLint moved to typescript-eslint, react-hooks and react-refresh, with React
  Router route exports allowed. knip ignores `@react-router/node`, a false
  positive for an SPA-only React Router app.

## Measurements

A cold first `/study` load dropped from 17.0 s (a Next curl) to 3.8 s (a full
headless-browser load). Re-request after an edit went from 462 ms to 25 ms,
peak dev memory from 2.85 GB to 2.15 GB, and `pnpm build` from 36 s to 7.8 s.

## Open

Removing Sentry env vars from the Vercel project needs the user's go-ahead.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
