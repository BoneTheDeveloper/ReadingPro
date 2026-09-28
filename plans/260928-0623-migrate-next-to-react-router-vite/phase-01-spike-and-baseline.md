---
phase: 1
title: "Spike and Baseline"
status: completed
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Spike and Baseline

## Goal

Record Next dev performance numbers and prove the documented toolchain works
before any app code moves: a React Router SPA built by Vite, and a separate
Hono + Workflow SDK backend built by Nitro, in dev, in build, and for both
deploy presets.

## Context

- **Frontend (React Router docs).** `ssr: false` + `prerender: ["/"]` emits a
  static `build/client` with `index.html` (prerendered `/`) and
  `__spa-fallback.html` for every other path; the host rewrites unknown paths
  to the fallback. SPA mode is documented to pair with a separate API server
  called from `clientLoader`.
  https://reactrouter.com/how-to/spa, https://reactrouter.com/how-to/pre-rendering
- **Backend (Workflow SDK docs).** `nitro.config.ts` with
  `modules: ["workflow/nitro"]` and a Hono app as the route handler; run with
  `nitro dev` / `nitro build`. https://workflow-sdk.dev/docs/getting-started/hono
- **Serving the SPA from Nitro (Nitro config docs).** `publicAssets` serves
  `build/client`; `renderer: { template, static: true }` is the lowest-priority
  catch-all, so `__spa-fallback.html` answers only paths no API route or
  static file matched. https://nitro.build/config, https://nitro.build/docs/renderer
- **Not supported: one Vite config for React Router SPA + Nitro.** The only
  official React Router + `nitro/vite` example is SSR (`ssr: true`,
  `examples/vite-ssr-react-router` in nitrojs/nitro). No doc covers SPA mode.
  The spike confirmed it does not build (see Findings), so it is out of scope.

## Findings so far (2026-09-28)

- Baseline done: `plans/reports/baseline-260928-next-dev-performance.md`.
- Versions today: React Router 8.4.0 (not v7), Vite 8.3.1, Nitro
  3.0.260903-beta, Hono 4.13.9, Workflow SDK 4.8.9.
- Single-Vite layout (reactRouter + nitro/vite + workflow/vite): dev works
  (`/` rendered, Hono `/api/ping`, a two-step workflow reached `completed`),
  but `vite build` fails. React Router prerenders inside `builder.buildApp`
  through `vite preview` before Nitro's `buildApp` hook has built the server,
  so the preview has no server build. Rejected as unsupported.
- Hono + `workflow` on Nitro works (proved in dev above).
- Plain `vite build` of React Router 8.4 writes `index.html` and
  `__spa-fallback.html`, then does not exit (native `fs.watch` handles left
  open), even with only `reactRouter()` in the config. The `react-router build`
  CLI exits normally in 11 s, so scripts use the CLI.
- Split layout verified end to end (dev with proxy, both presets, node-server
  boot, workflow, streaming): `plans/reports/spike-260928-vite-nitro-layout.md`.
- `nitro build` auto-detects `vite.config.ts` and switches to the Vite builder,
  which reruns React Router and empties `build/client`. Pin
  `builder: "rolldown"` in `nitro.config.ts` (documented `builder` option).

## Tasks & Steps

1. **Baseline.** Done (see Findings).
2. **Spike** in the git-ignored `spike/` folder, with separate configs:
   - `react-router.config.ts`: `ssr: false`, `prerender: ["/"]`.
   - `vite.config.ts`: `tailwindcss()`, `reactRouter()`, and
     `server.proxy["/api"]` → `http://localhost:3001`. No Nitro plugin.
   - `nitro.config.ts`: `builder: "rolldown"`, `modules: ["workflow/nitro"]`,
     `routes: { "/api/**": "./server/app.ts" }`, `devServer.port` or
     `--port 3001`, and for production `publicAssets: [{ dir: "build/client" }]`
     plus `renderer: { template: "build/client/__spa-fallback.html", static: true }`.
3. Minimal app: prerendered `/`, client route `/study` with a `clientLoader`
   calling `/api/ping`, Hono `GET /api/ping`, Hono route calling `start()` on a
   two-step `"use workflow"` function and a status route using `getRun()`.
4. Verify:
   - dev: `react-router dev` (3000) + `nitro dev --port 3001`; `/` renders,
     `/api/ping` answers through the proxy, workflow reaches `completed`;
   - `react-router build` then `NITRO_PRESET=vercel nitro build` produces
     `.vercel/output` with `static/index.html` and `static/__spa-fallback.html`;
   - `NITRO_PRESET=node-server nitro build`, then `node .output/server/index.mjs`
     serves `/` (prerendered HTML), `/study` (SPA fallback), `/api/ping`, and
     the workflow reaches `completed`.
5. Write `plans/reports/spike-260928-vite-nitro-layout.md` with the exact
   config files that worked and delete `spike/`.

## Files

- Create: `plans/reports/baseline-260928-next-dev-performance.md` (done)
- Create: `plans/reports/spike-260928-vite-nitro-layout.md`
- Temporary: `spike/**` (deleted before phase ends)

## Todo

- [x] Baseline numbers recorded (cold start, HMR, RSS, build)
- [x] Single-Vite layout tried and rejected with evidence
- [x] Split layout: dev with proxy works (page, API, workflow)
- [x] Both presets build; node-server output serves `/`, fallback, API, workflow
- [x] Decision report written, `spike/` removed

## Success Criteria

- Baseline report exists with numbers from 3 runs per metric.
- Spike report lists the exact config files that worked, and both preset
  builds plus the node-server boot are confirmed.

## Risks

- React Router build does not exit after prerender under plain `vite build`
  → resolved by using the `react-router build` CLI.
- Workflow `"use step"` bundling under Nitro's rolldown builder differs from
  dev → caught here on a toy workflow, not on production code.

## Rollback

Nothing in `src/` changes in this phase. Delete `spike/` and the two reports.
