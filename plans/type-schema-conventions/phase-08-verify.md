---
phase: 8
title: "Verify"
status: pending
priority: P1
effort: "0.5h"
dependencies: ["phase-02", "phase-03", "phase-04", "phase-05", "phase-06", "phase-07"]
---

# Phase 8: Verify

## Overview

Verify convention changes hoàn tất và không break anything.

## Verification Commands

```bash
pnpm run typecheck
pnpm run lint
npx knip
```

## Implementation Steps

1. [ ] Run `pnpm run typecheck`
2. [ ] Run `pnpm run lint`
3. [ ] Run `npx knip`
4. [ ] Review knip results
5. [ ] Update knip config if needed

## Success Criteria

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] Knip shows minimal false positives
- [ ] All features functional
