---
title: "Panel auto-collapse race condition fix"
date: "2026-07-22"
tags: ["bugfix", "ui", "study-page"]
---

# Panel auto-collapse race condition fix

## Problem
The `use-study-panel-layout.ts` hook had a race condition between the `collapsible` prop and `panel.collapse()`. The timing pattern `setCollapsible(true)` → `setTimeout` → `panel.collapse()` was problematic because:
1. Setting `collapsible=true` enables library's auto-collapse on resize (unwanted)
2. Explicit `panel.collapse()` call was redundant once `collapsible=true`
3. `setTimeout(0)` created async timing issues

## Solution
Sequenced the collapsible prop correctly — enable only during manual collapse:
- **Collapse path**: `setCollapsible(true)` → `panel.collapse()` → `setCollapsed(true)` (sync, no setTimeout)
- **Expand path**: `panel.expand()` → `setCollapsed(false)` → `setCollapsible(false)`

## Files Changed
- `src/app/[locale]/(dashboard)/study/_hooks/use-study-panel-layout.ts`

## Result
- Panel resize now hard-stops at `minSize` (no auto-collapse when dragging)
- Toggle button still collapses/expands panels via explicit `panel.collapse()`/`panel.expand()` calls
- No more race conditions

## Key Insight
`react-resizable-panels` auto-collapses when `collapsible=true` AND size drops below `minSize`. By keeping `collapsible=false` by default and only enabling it briefly during explicit toggle, we get manual-only collapse with hard-stop resize.
