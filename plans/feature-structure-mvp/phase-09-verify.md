---
phase: 9
title: "Verify"
status: pending
priority: P1
effort: "1h"
dependencies: ["phase-02", "phase-03", "phase-04", "phase-05", "phase-06", "phase-07", "phase-08"]
---

# Phase 9: Verify

## Overview

Verify refactor hoàn tất và không break anything.

## Requirements

- Functional: All features work correctly
- Non-functional: TypeScript compiles, Knip clean

## Implementation Steps

1. [ ] Run `pnpm run typecheck` - must pass
2. [ ] Run `pnpm run lint` - must pass
3. [ ] Run `npx knip` - check for new unused exports
4. [ ] Run `pnpm run build` - must build successfully
5. [ ] Delete all old directories:
   ```
   src/features/dictionary/{actions.ts,db/,services/}
   src/features/vocabulary/{actions.ts,db/,schemas/,services/}
   src/features/studio-panel/{actions.ts,db/,lib/,schemas/,services/}
   src/features/reading/{db/,schemas/,services/}
   src/features/upload/{actions.ts,lib/,schemas/}
   src/features/ai-chat/{lib/,services/}
   src/features/passage/db/
   ```
6. [ ] Verify imports in all components
7. [ ] Test critical user flows:
   - Dictionary search
   - Vocabulary CRUD
   - Upload file
   - Reading translation

## Success Criteria

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run build` succeeds
- [ ] `npx knip` shows minimal false positives
- [ ] No broken imports
- [ ] All features functional

## Rollback Plan

If issues found:
1. Revert git changes for affected feature
2. Re-run typecheck
3. Investigate issues
4. Re-apply fixes

## Verification Commands

```bash
# Type check
pnpm run typecheck

# Lint
pnpm run lint

# Build
pnpm run build

# Knip
npx knip

# Dev server
pnpm run dev
```
