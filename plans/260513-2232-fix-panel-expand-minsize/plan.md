# Fix: Panel expand restores collapsedSize instead of minSize

## Context

When left/right panels in the study page are collapsed then expanded, `expand()` on `PanelImperativeHandle` restores to `collapsedSize` (60px) instead of the panel's `minSize` (220/240px). The panel stays at 60px width after expanding.

## File to modify

- `src/app/(dashboard)/study/study-page-client.tsx` — lines 61-69 (two useEffect hooks)

## Fix

Replace `expand()` calls with `resize(minSize)` in both useEffect hooks. `resize()` explicitly sets the panel to the target size, avoiding the stale collapsedSize.

**Left panel** (minSize=220):
```tsx
useEffect(() => {
  if (leftPanelCollapsed) leftPanelRef.current?.collapse();
  else leftPanelRef.current?.resize(220);
}, [leftPanelCollapsed]);
```

**Right panel** (minSize=240):
```tsx
useEffect(() => {
  if (rightPanelCollapsed) rightPanelRef.current?.collapse();
  else rightPanelRef.current?.resize(240);
}, [rightPanelCollapsed]);
```

## Verification

1. `npm run dev` → open study page
2. Collapse left panel → verify it shrinks to 60px
3. Expand left panel → verify it restores to 220px (not 60px)
4. Repeat for right panel → verify it restores to 240px
5. `npm run build` — no type errors
