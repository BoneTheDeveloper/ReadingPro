---
phase: 2
title: "Relocate lib to server and schemas to shared"
status: pending
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Relocate lib to server and schemas to shared

## Overview
Move backend code from `src/lib/` into `src/server/`, lift the pure contract schemas into `src/shared/`, and add path aliases. Mechanical, behavior-preserving. Makes the layout visually express the boundary Phase 1 enforced.

## Requirements
- Functional: identical runtime behavior; all imports resolve; tests green.
- Non-functional: clear top-level split (`server/` = backend, `shared/` = contract, `features/` = frontend); future Hono lift = "move `src/server/`".

## Architecture
Single alias today: `@/* → ./src/*` (tsconfig). Add `@/server/*` and `@/shared/*` (optional but clearer). 18 `@/lib` import sites total — small, mechanical update. The four `*-response-schema.ts` files are verified pure (no prisma/db/ai runtime imports) → safe to move into client-reachable `shared/`.

## Related Code Files
**Move (and update all importers):**
- `src/lib/{ai,db,auth,storage}` → `src/server/{ai,db,auth,storage}`
- `src/lib/api/route-errors.ts`, `src/lib/api/shared/api-response-schema.ts` → `src/server/http/`
- domain backend logic `src/lib/{study,dictionary,translation,upload,vocabulary,spaced-repetition,parsers,domain,observability,core}` → `src/server/modules/<domain>` (keep `core`/`observability` as `src/server/core`, `src/server/observability`)
- contract schemas `src/lib/<domain>/shared/*-response-schema.ts`, `src/lib/study/chat/chat-schema.ts`, `src/lib/validation/upload.ts` → `src/shared/<domain>/`
- `src/lib/shared/{utils,reading-utils}.ts` → `src/shared/` (pure utils)
- `src/lib/ui/cefr-style.ts` → `src/shared/ui/cefr-style.ts` (view concern, client-safe)

**Modify:**
- `tsconfig.json` — add `@/server/*`, `@/shared/*` aliases.
- all `@/lib/...` import sites (~18) → new paths.
- co-located `*.test.ts` files move with their targets; update test imports.

## Implementation Steps
1. Add aliases to `tsconfig.json` paths.
2. Move folders per the map above using `git mv` (preserves history). Do one domain at a time.
3. After each move, update importers (`rg -l "@/lib/<moved>" src` → rewrite). Run `pnpm run typecheck` between moves to catch breakage early.
4. Re-confirm Phase 1 invariant: no `server-only` module ends up imported by a client component (build will catch).
5. Verify `src/shared/` has zero imports from `src/server/` (`rg "@/server" src/shared` must be empty) — keeps the contract pure.
6. Delete the now-empty `src/lib/` tree.
7. Run `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` — all green.

## Success Criteria
- [ ] `src/lib/` removed; backend under `src/server/`, contract under `src/shared/`.
- [ ] `rg "@/server" src/shared` returns nothing (contract stays pure).
- [ ] No client component imports `server-only` code (build-enforced).
- [ ] typecheck, lint, test, build all pass; no behavior change.

## Risk Assessment
- Risk: large import churn → transient breakage. Mitigation: move per-domain, typecheck between moves, `git mv` for reviewable history.
- Risk: a schema file silently gains a server dep during the move. Mitigation: Step 5 grep guard.
- Risk: Next.js/Turbopack alias caching. Mitigation: restart dev server / clear `.next` if resolution looks stale.
