---
phase: 5
title: "Ai-chat service and lib split"
status: completed
priority: P3
effort: "20m"
dependencies: [0]
---

# Phase 5: Ai-chat service and lib split

## Overview

`ai-chat/` currently has both its files flat at feature root (`chat-service.ts`,
`chat-utils.ts`), with no `services/`/`lib/` subfolders at all. Bring it in line with the strict
template: business logic in `services/`, pure helpers in `lib/`.

## Requirements

- Functional: app behavior unchanged.
- Non-functional: `ai-chat/services/chat-service.ts` and `ai-chat/lib/chat-utils.ts` exist; nothing left flat at feature root.

## Related Code Files

| Move | To |
|---|---|
| `src/features/ai-chat/chat-service.ts` | `src/features/ai-chat/services/chat-service.ts` |
| `src/features/ai-chat/chat-utils.ts` | `src/features/ai-chat/lib/chat-utils.ts` |

Known importers (grep-verified 2026-07-07):

- **chat-service**: `src/features/studio-panel/actions.ts`, `src/app/api/studio/chat/route.ts`
- **chat-utils**: `src/app/api/studio/chat/route.ts`

Note: `chat-service.ts` likely imports `chat-utils.ts` internally (same feature) — update that
intra-feature import too, not just the two external importers.

## Implementation Steps

1. `git mv src/features/ai-chat/chat-service.ts src/features/ai-chat/services/chat-service.ts`
2. `git mv src/features/ai-chat/chat-utils.ts src/features/ai-chat/lib/chat-utils.ts`
3. Fix the intra-feature import inside `chat-service.ts` (now `services/chat-service.ts`) pointing to `chat-utils.ts` (now `lib/chat-utils.ts`).
4. Update the two external importers (`studio-panel/actions.ts`, `app/api/studio/chat/route.ts`).
5. Re-grep `features/ai-chat/chat-service` and `features/ai-chat/chat-utils` to confirm zero remaining hits at old paths.
6. `pnpm run typecheck && pnpm run lint`.

## Success Criteria

- [x] Both files moved; nothing flat remains at `ai-chat/` root
- [x] Intra-feature import (`chat-service.ts` → `chat-utils.ts`) updated
- [x] Both external importers updated
- [x] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Very low — 2 files, 2 known external importers, 1 intra-feature import to catch.
