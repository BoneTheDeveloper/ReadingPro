---
title: "Restructure src into client, server, and shared boundaries"
description: "Group src/ by runtime first (client/, server/, shared/) and by domain inside each, then move Hono handlers onto native middleware, validation, and onError."
status: pending
priority: P2
effort: 2d
branch: bone/refactor/src-boundaries
tags: [refactor, frontend, backend, tech-debt]
blockedBy: []
blocks: []
created: 2026-09-29
---

# Restructure src into client, server, and shared boundaries

## Overview

`src/` mixes three axes at the top level: runtime (`server/`, `workflows/`),
layer (`component/`, `lib/`), and domain (`features/`). The client has no root
folder, so the ESLint boundary rule lists `src/{app,component,features,lib}` by
hand and silently misses any new folder. The frontend is split by domain while
the backend is split by layer, so one domain such as passage lives in six places,
and domain names have drifted (`studio` vs `artifact`/`ai-chat`, `reading` vs
`translate`). Hono handlers still use a Next.js-shaped wrapper
(`withErrorHandling(name, (req, { params: Promise }) => Response)`), which
bypasses Hono's `Context`.

This plan implements option B from the decision page: runtime first, domain
inside each runtime. It covers roadmap steps 1 to 5. Hono RPC and per-runtime
tsconfig (steps 6 and 7) are out of scope.

Decision page: https://claude.ai/artifact/QkP9KcPXD1rWxrGYYaoqtc

## Contract

- **Outcome:** `src/` has exactly three top-level source roots (`client/`,
  `server/`, `shared/`). Client and server are organized by the same domain
  names (`auth`, `passage`, `reading`, `studio`, `vocabulary`). `shared/` has no
  dependency on generated Prisma code. Every Hono route uses session middleware,
  `zValidator`, `c.json()`, and a single `app.onError`. All current features
  behave exactly as before.
- **Constraints:** Keep the `@/*` path alias. Keep every public API URL, method,
  request body, response body, and error envelope `{ error: { code, message, details? } }`
  unchanged. No DB schema change. No UI change. Each phase is its own commit and
  leaves `pnpm typecheck`, `pnpm lint`, and `pnpm build` green.
- **Non-goals:** Hono RPC (`hc<AppType>`), split tsconfig per runtime, new
  path aliases (`@client/*` etc.), rewriting service logic, changing workflow
  logic, adding tests beyond what verification needs, monorepo split.

## Target layout

```
src/
├─ client/                     # React Router appDirectory
│  ├─ root.tsx  routes.ts  globals.css
│  ├─ routes/
│  ├─ features/{auth,passage,reading,studio,vocabulary}/
│  │  └─ {api,components,hooks,lib}/ + index.ts
│  ├─ components/{ui,layout}/
│  └─ lib/
├─ server/
│  ├─ app.ts
│  ├─ modules/{auth,passage,reading,studio,vocabulary}/
│  ├─ middleware/
│  ├─ lib/                     # prisma, logger, app-error
│  ├─ db/generated/            # prisma output (gitignored)
│  └─ security-headers.ts
└─ shared/
   ├─ api-error.ts
   ├─ enums.ts
   └─ {passage,reading,studio,vocabulary}/
```

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Client root](./phase-01-client-root.md) | Pending | 3h |
| 2 | [Client naming and feature APIs](./phase-02-client-naming-feature-api.md) | Pending | 2h |
| 3 | [Server domain modules](./phase-03-server-domain-modules.md) | Pending | 3h |
| 4 | [Shared by domain, Prisma decoupling](./phase-04-shared-domain-prisma.md) | Pending | 3h |
| 5 | [Hono-native handlers](./phase-05-hono-native-handlers.md) | Pending | 5h |

Phases run strictly in order; each depends on the previous one. Phases 1 to 4
only move files and rewrite imports. Phase 5 is the only phase that changes
runtime code paths.

## Success Criteria

- [ ] `ls src` shows only `client`, `server`, `shared` (plus the gitignored Prisma output if it stays under `server/db`).
- [ ] No folder named `component`, `hook`, `util`, or `utils` exists under `src/`.
- [ ] `git grep -n "@/generated/prisma" src/shared src/client` returns nothing.
- [ ] ESLint boundary rules use the globs `src/client/**`, `src/server/**`, `src/shared/**` and no folder list.
- [ ] `git grep -n "withErrorHandling\|requireApiSession" src` returns nothing.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm exec knip` pass after every phase.
- [ ] Manual smoke on `pnpm dev:web` + `pnpm dev:api`: Google sign-in, import text/PDF/YouTube passage reaching COMPLETED, translate a word, AI chat stream, generate flashcards and questions reaching COMPLETED, vocabulary CRUD, unauthenticated `/api/passage` returns 401 with the same body as before.
- [ ] README "Directory map" matches the new tree.

## Key Risks

- The Workflow SDK Nitro module writes generated routes into `src/app/.well-known/workflow`. After `app/` moves, it may write to a new place or fail to find the React Router app. Phase 1 verifies with `pnpm build` and a workflow run before anything else moves.
- Workflow files are discovered by the `"use workflow"` / `"use step"` directives. Moving them in Phase 3 must keep discovery working; verify with a real passage import.
- `@hono/zod-validator` returns its own 400 body by default. Phase 5 must pass a hook that produces the existing `VALIDATION` envelope, or the client error messages change.
- The AI chat route streams a `Response`. It must keep returning the raw stream response, not `c.json()`.
- Plan `260928-0623-migrate-next-to-react-router-vite` still has phases 4 and 5 open. Its remaining work touches tooling and deploy, not these files, but it should be merged or rebased first to avoid conflicts in `eslint.config.mjs` and `nitro.config.ts`.

## Validation Log

### Session 1 (2026-09-29)

Decisions confirmed by the user; all match the plan as written, so no phase file changed.

- Path alias: keep `@/*`; imports become `@/client/...`, `@/server/...`, `@/shared/...`.
- API URLs: keep `/api/artifact`, `/api/ai-chat`, `/api/translate` and all others unchanged.
- Prisma enums: duplicate into `src/shared/enums.ts` with a compile-time sync check on the server.
- Feature entry points: add `index.ts` per client feature and a lint rule against deep cross-feature imports.

### Verification Results

- Claims checked: 18
- Verified: 18 | Failed: 0 | Unverified: 0
- Tier: Full
- Checked: alias import counts (`@/component/` 28, `@/features/` 16, `@/lib/` 45 files), `@/app/` never imported, 19 `withErrorHandling` call sites across 5 route files, single importer per `server/util/*` file, 4 shared contracts and 12 client files importing Prisma enums, Prisma `output` path, `.gitignore` entry, `components.json` aliases, ESLint boundary globs, `knip.json` entry, no `knip` script (uses `pnpm exec knip`), no `@hono/zod-validator` dependency yet.

### Whole-Plan Consistency Sweep

No contradictions between the overview, phase steps, and success criteria after the decisions above.

<!-- slug: src-boundary-restructure -->
