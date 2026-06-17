---
phase: 4
title: "Src Layer Rename"
status: pending
priority: P1
effort: "5h"
dependencies: []
---

# Phase 4: Src Layer Rename

## Overview
Behavior-preserving full layer re-naming (Scheme 1) for self-describing roles. Single
isolated commit gated by a green `typecheck && lint && test` baseline before and after.

## Requirements
- Functional: no behavior change. Every import resolves; `tsconfig.json` paths updated.
- Non-functional: names describe role; `core`/`domain`/`api` overloads removed.

## Architecture
TDD = capture baseline first. Run `pnpm typecheck && pnpm lint && pnpm test` and record green
BEFORE touching code; the same command must be green AFTER. No new tests (pure rename).

Rename map (Scheme 1):
| Current | New | Importer files |
|---------|-----|----------------|
| `src/shared` | `src/contracts` | 95 |
| `src/components` | `src/ui` | 27 |
| `src/shared/api` | `src/contracts/http` | 12 |
| `src/shared/core` (sentry) | `src/contracts/observability` | 2 |
| `src/shared/domain` (cefr) | `src/contracts/domain` | 6 |
| `src/server/core` (logger) | `src/server/observability` (merge; no `logger.ts` collision, verified) | 40 |
| `src/features/*/api` (fetchers) | `src/features/*/api-client` | 9 (5 dirs) |

`src/app`, `src/features` (top-level), `src/server` (top-level) unchanged. `src/app/` is
Next.js-reserved — do not rename.

Scope reaches beyond `src/`: tests and root configs import these aliases. Must update:
`tests/**`, `sentry.server.config.ts`, `sentry.edge.config.ts`.

## Related Code Files
- Modify: `tsconfig.json` (paths: add `@/contracts/*`, `@/ui/*`; keep `@/server/*`; drop `@/shared/*`)
- Modify: ~395 alias import sites across `src/**`, `tests/**`, root `sentry.*.config.ts`
- Move (git mv): the folders per rename map above
- Note: `eslint.config.mjs` glob `src/shared/**` must change to `src/contracts/**` — done in Phase 5

## Implementation Steps
1. Record green baseline: `pnpm typecheck && pnpm lint && pnpm test`. Abort plan if not green.
2. `git mv` folders bottom-up: sub-buckets first (`shared/api`->`contracts/http` etc., `server/core`->`server/observability`, `features/*/api`->`features/*/api-client`), then top-level `shared`->`contracts`, `components`->`ui`.
3. Update `tsconfig.json` `paths`: add `@/contracts/*` -> `./src/contracts/*` and `@/ui/*` -> `./src/ui/*`; remove `@/shared/*`. Keep `@/*` catch-all.
4. Mechanical import rewrite across `src/`, `tests/`, root configs:
   - `@/shared/api` -> `@/contracts/http`; `@/shared/core` -> `@/contracts/observability`; `@/shared/domain` -> `@/contracts/domain`; remaining `@/shared/` -> `@/contracts/`
   - `@/components/` -> `@/ui/`
   - `@/server/core/` -> `@/server/observability/`
   - `features/*/api` fetcher imports (relative + alias) -> `features/*/api-client`
5. Fix any relative imports broken by folder moves (intra-module `./`/`../` should survive a unit move; verify).
6. Re-run green gate: `pnpm typecheck && pnpm lint && pnpm test`. Must match baseline.
7. Commit as one isolated refactor commit.

## Success Criteria
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green (matches pre-rename baseline)
- [ ] `rg "@/shared/|@/components/|@/server/core/" src tests *.ts` returns nothing
- [ ] No `core`/`domain` ambiguous buckets remain; `features/*/api` renamed to `features/*/api-client`
- [ ] `tsconfig.json` paths updated; no dangling `@/shared/*` alias
- [ ] Lands as a single commit

## Risk Assessment
Medium (churn ~395 sites). Mitigations: green baseline gate both ends; `git mv` preserves
history; mechanical find/replace verified by typecheck; isolated commit enables clean revert.
Edge: `server/observability` already exists (logger merge target) — confirm no filename
collision (`logger.ts` vs existing files) before moving.
