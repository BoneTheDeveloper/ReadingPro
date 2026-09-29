---
title: src boundary restructure executed
date: 2026-09-29
summary: Moved src into client/server/shared with domain folders and Hono-native handlers across five commits on bone/refactor/src-boundaries
---

# src boundary restructure executed

## What happened
Executed plan 260929-0238-src-boundary-restructure in five commits on `bone/refactor/src-boundaries`:
client root, client naming plus feature `index.ts`, server domain modules, shared-by-domain with
Prisma decoupling, and Hono middleware/zValidator/onError. typecheck, lint and build pass after
every phase. knip reports one unused export (`VocabularySetSchema`) that already existed on main;
the user said it belongs to unfinished work, so it was left alone.

## Surprises
- Feature barrels merged Rolldown's chunk graph: the login and dashboard-layout chunks started
  loading the studio (191 kB) and vocabulary code. Fixed with
  `build.rolldownOptions.treeshake.moduleSideEffects` marking `src/client/features/*/index.ts`
  side-effect free; chunk sizes then matched the Phase 1 build.
- A regex import rewriter also matched text inside a prompt string in `ai-chat.ts`; caught by
  diffing moved files against HEAD.
- `src/app/.well-known` was stale Next.js-era workflow output; Nitro no longer writes it under src.

## Decisions
- `/api/translate` stays public (no session middleware) because it had no session check before.
- Missing-`passageId` query checks and the progress-by-type validation stay in handlers so
  error bodies match exactly.
- Validation failures are thrown from the zValidator hook so one onError builds every envelope.

## Behavior deltas
Malformed or empty JSON bodies now return 400 VALIDATION instead of 500 INTERNAL; a JSON body
sent as text/plain is ignored. Details are in the plan's `reports/golden-errors.md`.

## Next steps
Manual smoke with Google sign-in (passage import, artifacts, chat stream, vocabulary CRUD), then PR.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
