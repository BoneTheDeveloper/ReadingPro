---
phase: 1
title: "Implement"
status: completed
priority: P2
effort: "15m"
dependencies: []
---

# Phase 1: Implement

## Overview
Simplify the panel layout hook to remove auto-collapse behavior while keeping manual toggle functionality.

## Requirements
- **Functional**: Panel resize hard-stops at `minSize` (no auto-collapse)
- **Functional**: Toggle button still collapses/expands panels manually
- **Non-functional**: No race conditions between state and panel methods

## Related Code Files
- Modify: `src/app/[locale]/(dashboard)/study/_hooks/use-study-panel-layout.ts`
- Modify: `src/app/[locale]/(dashboard)/study/_components/study-workspace.tsx`

## Implementation Steps

### 1. Simplify `use-study-panel-layout.ts`

**Before** (problematic):
```typescript
const toggleLeft = useCallback(() => {
  const panel = leftPanelRef.current;
  if (!panel) return;

  if (!panel.isCollapsed()) {
    setLeftPanelCollapsible(true);  // ← Enables auto-collapse (bad!)
    setTimeout(() => {
      panel.collapse();  // ← Redundant once collapsible=true
      setLeftPanelCollapsed(true);
    }, 0);
  } else {
    panel.expand();
    setLeftPanelCollapsed(false);
    setTimeout(() => setLeftPanelCollapsible(false), 150);
  }
}, []);
```

**After** (fixed):
```typescript
const toggleLeft = useCallback(() => {
  const panel = leftPanelRef.current;
  if (!panel) return;

  if (!panel.isCollapsed()) {
    // Collapse: enable collapsible briefly, then collapse
    setLeftPanelCollapsible(true);
    panel.collapse();
    setLeftPanelCollapsed(true);
  } else {
    // Expand: no collapsible needed
    panel.expand();
    setLeftPanelCollapsed(false);
    setLeftPanelCollapsible(false);
  }
}, []);
```

Apply same pattern to `toggleRight`.

### 2. Update `study-workspace.tsx`

Remove or simplify `collapsible` prop — always pass `false` when not actively collapsing:
```tsx
<Panel
  panelRef={layout.leftPanelRef}
  id="source"
  defaultSize="280px"
  minSize="200px"
  maxSize="800px"
  collapsible={layout.leftPanelCollapsible}  // Will be false except during collapse
>
```

The hook already passes `leftPanelCollapsible` which will default to `false`. This is correct.

### 3. Verify

- Panel should not auto-collapse when dragged below `minSize`
- Toggle button should still collapse/expand panels
- No console errors or race conditions

## Success Criteria
- [ ] Panel resize hard-stops at `minSize` (200px)
- [ ] Toggle button collapses panel to `collapsedSize` (60px)
- [ ] Toggle button expands panel back to previous size
- [ ] No console errors during resize or toggle
- [ ] TypeScript compiles without errors

## Risk Assessment
- **Low risk**: Simple state management change
- **No breaking changes**: External API unchanged
- **Mitigation**: Test both resize and toggle behaviors
