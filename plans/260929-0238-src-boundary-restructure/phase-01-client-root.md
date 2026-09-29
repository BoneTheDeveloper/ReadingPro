---
phase: 1
title: "Client root"
status: pending
priority: P2
effort: "3h"
dependencies: []
---

# Phase 1: Client root

## Goal

Move every browser-only folder under `src/client/` so the client boundary is one
glob, without changing any behavior.

## Context

Today the client is four sibling folders: `src/app`, `src/component`,
`src/features`, `src/lib`. The ESLint rule in `eslint.config.mjs` lists them by
hand. `react-router.config.ts` sets `appDirectory: "src/app"`. Only `@/component/`
(28 files), `@/features/` (16 files), and `@/lib/` (45 files) are imported by alias;
`@/app/` is never imported. Server code never imports these (enforced by lint).

Folder renames inside the client (`component` → `components`, etc.) happen in
Phase 2 so this phase is a pure move.

## Files to Create / Modify

- Move: `src/app/` → `src/client/` (contents: `root.tsx`, `routes.ts`, `routes/`, `globals.css`; not `.well-known/`, which is generated)
- Move: `src/component/` → `src/client/component/`
- Move: `src/features/` → `src/client/features/`
- Move: `src/lib/` → `src/client/lib/`
- Modify: `react-router.config.ts` (`appDirectory: "src/client"`)
- Modify: `components.json` (`tailwind.css` → `src/client/globals.css`; aliases fixed in Phase 2)
- Modify: `eslint.config.mjs` (client glob `src/client/**/*.{ts,tsx}`; server rule blocks `@/client/*`)
- Modify: every file importing `@/component/`, `@/features/`, `@/lib/` (rewrite prefix to `@/client/...`)
- Modify: `README.md` directory map (client block only)

## Tasks & Steps

- [x] Create branch `bone/refactor/src-boundaries` from up-to-date `main`.
- [x] Record a baseline: run `pnpm typecheck && pnpm lint && pnpm build` on `main` and note where `.well-known/workflow` output lands (`find . -path ./node_modules -prune -o -name ".well-known" -print`).
- [x] `git mv src/app src/client`, then `git mv src/component src/features src/lib src/client/`. Delete the stale generated `src/client/.well-known/` if it moved along (it is self-gitignored).
- [x] Rewrite alias imports in `src/`:
      `@/component/` → `@/client/component/`, `@/features/` → `@/client/features/`, `@/lib/` → `@/client/lib/`.
      Use `git grep -l` + `sed -i` and review the diff; server files must show zero changes.
- [x] Update `react-router.config.ts` `appDirectory` and `components.json` `tailwind.css`.
- [x] Replace the client ESLint block's `files` with `["src/client/**/*.{ts,tsx}"]`. Replace the server block's forbidden group `["@/app/*", "@/component/*", "@/features/*", "@/lib/*"]` with `["@/client/*"]`. Keep the client block's server/workflows/prisma bans as they are.
- [x] Run `pnpm typecheck` (this regenerates `.react-router/types` for the new appDirectory).
- [x] Run `pnpm build` and confirm where the Workflow SDK writes `.well-known/workflow`. If it no longer generates, or generates under a path Nitro does not serve, fix it via the `workflow/nitro` module options before continuing.
- [x] Update the client part of the README directory map.
- [x] Commit: `refactor: move browser code under src/client`.

## Verification

- `pnpm typecheck && pnpm lint && pnpm build && pnpm exec knip` pass.
- `ls src` shows `client generated server shared workflows`.
- `git grep -n "@/component/\|@/features/\|@/lib/" src` returns nothing.
- Add a throwaway `import "@/server/lib/logger"` in a client file: `pnpm lint` fails. Remove it.
- `pnpm dev:api` + `pnpm dev:web`: landing page renders, login works, `/study` loads, importing a pasted-text passage reaches COMPLETED (proves workflow routes still resolve).

## Risk and Rollback

- Risk: Workflow SDK output location depends on detecting an `app` directory. Mitigation: the build check above runs before commit.
- Rollback: `git reset --hard` to the branch point; the phase is a single commit.
