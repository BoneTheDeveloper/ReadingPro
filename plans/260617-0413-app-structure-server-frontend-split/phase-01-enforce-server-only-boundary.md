---
phase: 1
title: "Enforce server-only boundary"
status: pending
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Enforce server-only boundary

## Overview
Add the `server-only` package marker to backend entry modules so any accidental import from a client bundle fails at build time. This is done BEFORE any file moves so it surfaces hidden leaks against the current, known-good tree (a clean baseline to diff against).

## Requirements
- Functional: backend modules become unimportable from client components; build/typecheck still passes (proves no current leak).
- Non-functional: zero behavior change; no file moves in this phase.

## Architecture
Today no file uses `server-only` (verified: `rg -l "server-only" src` returns nothing). Validation already showed zero `'use client'` components import `@/lib`, and only `app/[locale]/study/page.tsx` (a Server Component, legal) imports `lib/db`. So adding the marker should NOT break the build — if it does, it has found a real leak to fix.

`server-only` throws only when code is pulled into a client bundle; Server Components, server actions (`'use server'`), and route handlers can still import freely.

## Related Code Files
- Modify (add `import 'server-only';` at top): backend entry points under `src/lib/` —
  - `src/lib/db/client.ts` and `src/lib/db/*-queries.ts`
  - `src/lib/ai/*.ts` (question-generator, translator, content-simplifier, model-config, prompt-utils)
  - `src/lib/auth/*.ts` (auth-utils, sync-user)
  - `src/lib/storage/*`, `src/lib/upload/**/*.service.ts`
  - domain service/query entry files in `src/lib/{study,dictionary,translation,vocabulary,spaced-repetition,parsers}`
- Do NOT add to: `src/lib/**/*-schema.ts` (these are the contract, must stay client-safe), `src/lib/shared/*`, `src/lib/validation/*`, `src/lib/ui/cefr-style.ts`.
- Add dependency: `server-only` (`pnpm add server-only`).

## Implementation Steps
1. `pnpm add server-only`.
2. Add `import 'server-only';` as the first import to each backend entry module listed above. Leave pure schema/util/validation files alone.
3. Run `pnpm run typecheck` and `pnpm run build`.
4. If the build fails, the error names the offending client→server import chain. Fix by: routing the client through `features/<d>/api/` instead, or moving the shared piece into a pure module. Do NOT silence by removing the marker.
5. Run `pnpm run test` — all green.

## Success Criteria
- [ ] `server-only` installed; marker added to all backend entry modules, none added to schema/util/validation files.
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test` all pass.
- [ ] No `'use client'` file imports a `server-only` module (build-enforced).

## Risk Assessment
- Risk: a barrel/index file re-exports both client- and server-safe code, dragging `server-only` into a client bundle. Mitigation: split the barrel; keep schemas out of server-only files (already verified clean).
- Low overall risk — no moves, no logic change; this phase only *detects* and locks the existing boundary.
