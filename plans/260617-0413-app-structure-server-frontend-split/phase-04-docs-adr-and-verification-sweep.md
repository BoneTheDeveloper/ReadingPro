---
phase: 4
title: "Docs ADR and verification sweep"
status: pending
priority: P2
effort: "0.5d"
dependencies: [3]
---

# Phase 4: Docs ADR and verification sweep

## Overview
Record the new architecture as an ADR, update the docs that describe layout/conventions, and run a final whole-repo verification so the boundary rules are documented and enforced going forward.

## Requirements
- Functional: docs match the new structure; an ADR captures the decision + the four invariant rules.
- Non-functional: future contributors can follow a route in the fixed 3-step path and know where new code goes.

## Architecture
The repo keeps canonical docs under `docs/` (see `CLAUDE.md` / `docs/README.md`). Update the structural ones; add an ADR for the boundary decision.

## Related Code Files
- Create: `docs/ADR/<n>-server-frontend-boundary.md` — decision, the 4 invariant rules, the `app/ ↔ features/ ↔ server/ ↔ shared/` map, and why server actions were dropped (mobile/2nd-client readiness, one consistent pattern).
- Modify: `docs/codebase-summary.md` (source layout: `server/`, `shared/`, `features/`), `docs/code-standards.md` (boundary rules + "frontend talks to backend only via features/api"), `docs/Architecture/api-architecture.md` and `docs/API/api-implementation-conventions.md` (server actions removed; route-per-mutation), `docs/Architecture/frontend-ui-architecture/*` if they reference actions.
- Add a short "How to follow a route" note: `features/<d>/api` → `app/api/<d>/route.ts` → `server/modules/<d>`, contract in `shared/<d>`.

## Implementation Steps
1. Write the ADR.
2. Update `codebase-summary.md` and `code-standards.md` with the new tree + 4 rules.
3. Update API/architecture docs to drop server-action references and document the route-per-mutation convention.
4. Verification sweep:
   - `rg -l "^'use server'" src` → empty.
   - `rg "@/lib" src` → empty (old alias gone).
   - `rg "@/server" src/shared` → empty (contract pure).
   - `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` → all green.
5. Add eslint `no-restricted-imports` rule forbidding `@/server` (and `server/*`) imports inside `src/features/**/ui`, `src/features/**/hooks`, and `src/shared/**` so the boundary can't silently regress. Verify `pnpm run lint` flags a deliberate test violation, then remove the test import.

## Success Criteria
- [ ] ADR committed; `codebase-summary.md`, `code-standards.md`, API/architecture docs updated to new structure.
- [ ] All four verification greps return the expected (empty) results.
- [ ] typecheck, lint, test, build all pass.
- [ ] eslint import-boundary guard added and confirmed to flag `@/server` imports from `features/ui|hooks` and `shared/`.

## Risk Assessment
- Risk: docs drift from code if updated carelessly. Mitigation: grep-verify claims against the tree before writing.
- Low risk — documentation + verification only.
