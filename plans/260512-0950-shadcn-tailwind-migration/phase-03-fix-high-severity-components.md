---
phase: 3
title: "Fix HIGH severity components"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2]
---

# Phase 3: Fix HIGH severity components

## Overview

Refactor the 3 highest-violation components: `study-upload-modal.tsx` (~50 inline styles), `study-left-panel.tsx`, and `study-right-panel.tsx`. These have the most hardcoded hex colors, raw HTML elements, and JS hover handlers.

## Requirements

- Zero hardcoded hex colors in JSX
- Zero inline `style={{}}` except for dynamic values (progress widths, calculated positions)
- All interactive elements use shadcn primitives
- Hover effects use Tailwind `hover:` instead of `onMouseEnter`/`onMouseLeave`
- File sizes stay under 200 lines — split if needed

## Architecture

### study-upload-modal.tsx (477 lines → split + refactor)
- **Current**: Custom modal with `isOpen` prop, raw `<div>` overlay, ~50 `style={{ color: "#..." }}`
- **Target**: shadcn `Dialog` component. Extract upload zone and text input into separate components if needed to stay under 200 lines
- **Color mapping**:
  - `#185FA5` → `text-primary`
  - `#378ADD` → `bg-primary` or `text-primary` depending on context
  - `#E6F1FB` → `bg-accent`
  - `#B5D4F4` → `border-border`
  - `#FF4B4B` → `text-destructive`
  - `#1A1A1A` → `text-foreground`
  - `#6B7280` → `text-muted-foreground`
  - `#F3F4F6` → `bg-muted`
  - `#FFFFFF` → `bg-background`

### study-left-panel.tsx (298 lines)
- **Current**: `style={{ background: "#ffffff", borderRadius: "12px" }}`, shimmer with hardcoded hex, raw `<input>` and `<button>`
- **Target**: `Card` wrapper, `Input` for search, `Button` for actions, Tailwind `bg-background rounded-xl` for card style
- **Shimmer**: Convert hardcoded shimmer colors to theme tokens in `globals.css` animation

### study-right-panel.tsx (333 lines)
- **Current**: Same inline style patterns, `bg-primary/8` non-standard opacity syntax
- **Target**: `Card` wrapper, proper theme tokens, split if over 200 lines

## Related Code Files

- Modify: `src/app/(dashboard)/study/study-upload-modal.tsx`
- Modify: `src/app/(dashboard)/study/study-left-panel.tsx`
- Modify: `src/app/(dashboard)/study/study-right-panel.tsx`
- Modify: `src/app/(dashboard)/study/study-types.ts` — update props if Dialog changes interface
- Read: `src/app/globals.css` — verify shimmer animation token compatibility
- Reference: `src/components/ui/dialog.tsx` — Dialog API (from Phase 1)

## Implementation Steps

### study-upload-modal.tsx
1. Replace custom modal overlay with shadcn `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogClose`
2. Replace `const blue = { primary: "#185FA5", ... }` object with theme tokens
3. Replace all `style={{ color: "#..." }}` with Tailwind classes using token mapping above
4. Replace raw `<button>` (Cancel, Submit) with `Button` variants
5. Replace raw `<input>` and `<textarea>` with `Input` and `Textarea` (shadcn)
6. Replace `onMouseEnter`/`onMouseLeave` hover handlers with Tailwind `hover:` classes
7. If file exceeds 200 lines after refactor, extract upload-zone area into `study-upload-zone-section.tsx`
8. Verify modal open/close still works with Dialog's controlled API

### study-left-panel.tsx
1. Wrap card-like container in `Card` + `CardContent`
2. Replace `style={{ background: "#ffffff", borderRadius: "12px" }}` with `bg-background rounded-xl`
3. Replace raw `<input>` search bar with `Input` from shadcn
4. Replace raw `<button>` elements with `Button variant="ghost"`
5. Update shimmer skeleton colors: `#E6F1FB` → `bg-accent`, `#B5D4F4` → `border-border`
6. Replace `style={{ borderColor: "#e5e7eb" }}` with `border-border`

### study-right-panel.tsx
1. Wrap card-like container in `Card` + `CardContent`
2. Replace `style={{ background: "#ffffff", borderRadius: "12px" }}` with `bg-background rounded-xl`
3. Replace `style={{ borderBottom: "1px solid #e5e7eb" }}` with `border-b border-border`
4. Fix `bg-primary/8` → use `bg-primary/10` (valid Tailwind v4 opacity) or `bg-accent`
5. Update shimmer skeleton colors same as left panel
6. Replace any raw `<button>` with `Button` variant

## Success Criteria

- [ ] Zero hardcoded hex colors in all 3 files (`grep -r '#[0-9a-fA-F]\{6\}'` returns no matches in these files)
- [ ] Zero `style={{}}` except for dynamic values (progress widths)
- [ ] Zero `onMouseEnter`/`onMouseLeave` handlers
- [ ] All files under 200 lines
- [ ] Dialog opens/closes correctly in study-upload-modal
- [ ] Search input works in study-left-panel
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

## Risk Assessment

**High effort, medium risk** — these are the most complex components with the most changes.
- Modal refactor is the biggest change: Dialog has different API than custom `isOpen` prop. Need to adapt parent component (`study-page.tsx`) to use `DialogTrigger` or controlled open state.
- Mitigate: Test each component individually after refactor before moving to next.
- Mitigate: Git commit per component so changes can be isolated if one breaks.
