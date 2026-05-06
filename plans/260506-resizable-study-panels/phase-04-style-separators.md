# Phase 4: Style Separators + Verify

## Context
- Plan: `plans/260506-resizable-study-panels/plan.md`
- Depends on: Phase 3 (layout complete)

## Overview
Style the Separator components to show 10px gaps with subtle visual handles. Final verification of all functionality.

## Separator Styling

Each Separator in `study-page-client.tsx` gets this pattern:

```tsx
<Separator
  className="
    w-[10px]
    flex items-center justify-center
    cursor-col-resize
    bg-transparent
    [&[data-separator='hover']]:bg-black/5
    [&[data-separator='active']]:bg-black/10
    transition-colors
  "
>
  <div className="w-px h-8 rounded-full bg-black/10 group-data-[separator=hover]:bg-primary/40 group-data-[separator=active]:bg-primary/60 transition-colors" />
</Separator>
```

### Visual Behavior
- **Default**: 10px transparent gap, faint centered 1px vertical line (h-8, bg-black/10)
- **Hover**: Gap background lightens (bg-black/5), center line turns blue (bg-primary/40)
- **Active/Dragging**: Gap background darkens slightly (bg-black/10), center line turns brighter blue (bg-primary/60)
- **Cursor**: `col-resize` on entire gap area

### Data Attributes (v4 API)
- `data-separator="hover"` — mouse is over the separator
- `data-separator="active"` — user is actively dragging

## Verification Checklist

### TypeScript
```bash
npx tsc --noEmit
```

### Visual Checks
- [x] 10px gaps visible between all 3 panels
- [x] Faint centered line visible in each gap
- [x] Line highlights on hover (blue tint)
- [x] Line highlights brighter on drag
- [x] Panels cannot shrink below 220px
- [x] Panels cannot grow beyond 70% viewport

### Functional Checks
- [x] Upload modal opens, file uploads correctly
- [x] Source selection loads content in center panel
- [x] Simplify button works, view toggle appears
- [x] Generate Questions button works
- [x] Quiz card opens and functions
- [x] Summary card opens and functions
- [x] Disabled cards (Flashcards, Mind Map, Translate) show "Coming soon"

### Persistence Check
- [x] Resize panels, reload page → sizes restored

## Status: ✅ Completed

## Success Criteria
- [x] All visual checks pass
- [x] All functional checks pass
- [x] Persistence works
- [x] TypeScript compiles clean
- [x] No console errors
