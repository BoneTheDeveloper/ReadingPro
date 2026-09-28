---
phase: 1
title: "Spike and Baseline"
status: pending
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Spike and Baseline

## Goal

Record Next dev performance numbers and prove the target toolchain (React
Router framework mode + Nitro + Hono + Workflow SDK in one Vite project)
works for dev, build, and both deploy presets before any app code moves.

## Context

- Workflow SDK Vite setup: `vite.config.ts` with `nitro()` from `nitro/vite` and
  `workflow()` from `workflow/vite` (https://workflow-sdk.dev/docs/getting-started/vite).
- Workflow SDK Hono setup: `nitro.config.ts` with `modules: ["workflow/nitro"]`
  and a Hono app as the route handler (https://workflow-sdk.dev/docs/getting-started/hono).
- React Router SPA mode: `react-router.config.ts` with `ssr: false` and
  `prerender: ["/"]`.
- Unknown: whether the React Router Vite plugin and the Nitro Vite plugin can
  own one dev server together. This phase answers it.

## Tasks & Steps

1. **Baseline.** On the current Next app, record 3 runs each:
   - cold `pnpm dev` start until `/study` first renders (clear `.next` first);
   - HMR time after editing a component under `src/features/studio/component`;
   - peak RSS of the dev process (`/usr/bin/time -v` or `ps`);
   - `pnpm build` wall time.
   Write results to `plans/reports/baseline-260928-next-dev-performance.md`.
2. **Throwaway spike** in a git-ignored `spike/` folder at the repo root
   (deleted at phase end): install `vite`, `@vitejs/plugin-react`,
   `@react-router/dev`, `react-router`, `nitro`, `hono`, `workflow`,
   `@tailwindcss/vite`.
3. Build a minimal app: one prerendered `/` route, one client route with a
   `clientLoader`, one Hono route `GET /api/ping`, one Hono route that calls
   `start()` on a two-step `"use workflow"` function.
4. **Primary layout (A):** single `vite.config.ts` with
   `reactRouter()`, `nitro()`, `workflow()`; Nitro serves `/api/**` via Hono
   and the React Router client build as static assets.
5. If (A) fails in dev or build, **fallback layout (B):** two processes.
   Vite dev for React Router with `server.proxy["/api"]` → `nitro dev` on a
   fixed port (3001); build runs `react-router build` then `nitro build` with
   `publicAssets` pointing at `build/client`. Record which layout won and why.
6. Verify for the winning layout:
   - `pnpm dev`: `/` renders, `/api/ping` answers, workflow reaches completion in local world;
   - `NITRO_PRESET=vercel pnpm build` produces `.vercel/output`;
   - `NITRO_PRESET=node-server pnpm build` then `node .output/server/index.mjs` serves `/` (prerendered HTML) and `/api/ping`.
7. Write the decision to `plans/reports/spike-260928-vite-nitro-layout.md`
   and delete `spike/`.

## Files

- Create: `plans/reports/baseline-260928-next-dev-performance.md`
- Create: `plans/reports/spike-260928-vite-nitro-layout.md`
- Temporary: `spike/**` (deleted before phase ends)

## Todo

- [ ] Baseline numbers recorded (cold start, HMR, RSS, build)
- [ ] Spike app built with prerendered `/`, client route, Hono API, workflow
- [ ] Layout A tried; fallback B tried only if A fails
- [ ] Both presets build; node-server output boots
- [ ] Decision report written, `spike/` removed

## Success Criteria

- Baseline report exists with numbers from 3 runs per metric.
- Spike report names the chosen layout (A or B) with the exact config files
  that worked, and both preset builds are confirmed.

## Risks

- Plugin conflict between `reactRouter()` and `nitro()` → fallback B is a
  known-good split and only costs one extra dev process.
- Workflow `"use step"` bundling under Vite differs from Next → caught here on
  a toy workflow, not on production code.

## Rollback

Nothing in `src/` changes in this phase. Delete `spike/` and the two reports.
