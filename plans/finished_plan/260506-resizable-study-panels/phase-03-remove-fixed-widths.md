# Phase 3: Remove Fixed Widths from Side Panels

## Context
- Plan: `plans/260506-resizable-study-panels/plan.md`
- Depends on: Phase 2 (Panel controls width)

## Overview
Remove hardcoded `width: '220px'` and `width: '260px'` inline styles from left and right panel root divs. The Panel component from react-resizable-panels now controls width.

## Files Modified

### 1. `study-left-panel.tsx` (line 57)

**Before:**
```tsx
<div className="flex flex-col shrink-0 overflow-hidden" style={{ width: '220px', background: '#F8F8F7', borderRadius: '12px', boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.04)' }}>
```

**After:**
```tsx
<div className="flex flex-col h-full overflow-hidden" style={{ background: '#F8F8F7', borderRadius: '12px', boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.04)' }}>
```

Changes:
- Remove `width: '220px'` from style
- Remove `shrink-0` class (Panel manages sizing)
- Add `h-full` class (fill Panel height)

### 2. `study-right-panel.tsx` — 3 locations

The right panel has 3 separate `return` statements, each with its own root div containing `width: '260px'`.

**Location 1: Quiz view (line 58)**
```tsx
// Before:
<div className="flex flex-col shrink-0 overflow-hidden" style={{ width: '260px', background: '#F3F3F1', borderRadius: '12px', boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.04)' }}>

// After:
<div className="flex flex-col h-full overflow-hidden" style={{ background: '#F3F3F1', borderRadius: '12px', boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.04)' }}>
```

**Location 2: Summary view (line 78)**
```tsx
// Before:
<div className="flex flex-col shrink-0 overflow-hidden" style={{ width: '260px', background: '#F3F3F1', borderRadius: '12px', boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.04)' }}>

// After:
<div className="flex flex-col h-full overflow-hidden" style={{ background: '#F3F3F1', borderRadius: '12px', boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.04)' }}>
```

**Location 3: Default card grid view (line 111)**
```tsx
// Before:
<div className="flex flex-col shrink-0 overflow-hidden" style={{ width: '260px', background: '#F3F3F1', borderRadius: '12px', boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.04)' }}>

// After:
<div className="flex flex-col h-full overflow-hidden" style={{ background: '#F3F3F1', borderRadius: '12px', boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.04)' }}>
```

## Verification
- `npx tsc --noEmit` compiles
- Visual: panels fill their Panel container width
- No horizontal overflow or clipping

## Status: ✅ Completed

## Success Criteria
- [x] All 4 fixed width styles removed (1 left + 3 right)
- [x] `shrink-0` replaced with `h-full` on all root divs
- [x] Panels stretch to fill Panel container
- [x] Background colors and border-radius preserved
