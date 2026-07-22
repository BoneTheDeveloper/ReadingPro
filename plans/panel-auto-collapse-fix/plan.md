---
title: "Remove panel auto-collapse while keeping manual toggle"
description: "Fix race condition in panel layout hook by sequencing collapsible prop only during manual collapse operations"
status: completed
priority: P2
branch: "preview"
tags: ["bugfix", "ui"]
blockedBy: []
blocks: []
created: "2026-07-22T00:37:42.371Z"
createdBy: "ck-cli"
source: cli
---

# Remove panel auto-collapse while keeping manual toggle

## Problem
`collapsible={true}` causes panels to auto-collapse when dragged below `minSize`, creating race conditions with the toggle button. The timing pattern `setCollapsible(true) → setTimeout → panel.collapse()` is problematic because:
1. Setting collapsible=true enables auto-collapse on resize (unwanted)
2. The explicit `panel.collapse()` call is redundant once collapsible is true
3. Race condition between state updates and panel methods

## Solution
**Sequence the collapsible prop**: Enable it only during manual collapse, disable otherwise.

### State Machine
```
Expanded:  collapsible=false, collapsed=false  → Resize: hard stop at minSize
  ↓ toggle clicked
Collapsed: collapsible=false, collapsed=true   → Expand via button
  ↑ toggle clicked
```

### Key Changes
1. `use-study-panel-layout.ts`: Simplify toggle logic — set `collapsible=false` by default
2. `study-workspace.tsx`: Pass `collapsible={false}` or remove prop

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Implement](./phase-01-implement.md) | Pending |

## Dependencies

None
