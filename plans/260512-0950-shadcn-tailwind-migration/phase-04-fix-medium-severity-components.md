---
phase: 4
title: "Fix MEDIUM severity components"
status: pending
priority: P2
effort: "4h"
dependencies: [3]
---

# Phase 4: Fix MEDIUM severity components

## Overview

Refactor 6 MEDIUM severity components: `progress-dashboard.tsx`, `dashboard-sidebar.tsx`, `test-question-card.tsx`, `test-results-screen.tsx`, `reading-view-client.tsx`, `study-quiz-content.tsx`. Main violations: Tailwind v3 color syntax, raw buttons, missing shadcn primitives, inline SVGs.

## Requirements

- Replace all `bg-primary-600`, `bg-neutral-*`, `text-primary-700` with theme tokens
- Replace raw `<button>` with `Button` component
- Replace inline SVGs with Lucide icon imports
- Use `Card` for card-like layouts
- Use `Badge` for status indicators
- Each file stays under 200 lines

## Architecture

### progress-dashboard.tsx (191 lines)
- **Violations**: Zero shadcn imports, `bg-primary-600`, `text-primary-700`, `bg-neutral-50/100/200`, `text-neutral-500/900`, raw `<button>`
- **Target**: Import `Card`/`CardHeader`/`CardTitle`/`CardContent` for stat cards, `Button` for actions, `Progress` for progress bars
- **Color mapping**:
  - `bg-primary-600` → `bg-primary`
  - `text-primary-700` → `text-primary`
  - `bg-neutral-50` → `bg-muted`
  - `bg-neutral-100` → `bg-muted`
  - `bg-neutral-200` → `bg-muted`
  - `text-neutral-500` → `text-muted-foreground`
  - `text-neutral-900` → `text-foreground`

### dashboard-sidebar.tsx (259 lines)
- **Violations**: Inline SVG for search icon (line ~98) and notification bell (line ~109), raw `<input>` for search
- **Target**: Replace inline SVGs with `import { Search, Bell } from "lucide-react"`, replace raw `<input>` with `Input` from shadcn

### test-question-card.tsx (200 lines)
- **Violations**: `bg-primary-600`, `text-neutral-*`, raw `<button>`, no Card wrapper
- **Target**: `Card` wrapper, `Button` for option selection, theme tokens

### test-results-screen.tsx (75 lines)
- **Violations**: Zero shadcn imports, `bg-primary-600`, `bg-neutral-*`, raw `<button>`
- **Target**: `Card` wrapper, `Button` for retry/navigation, theme tokens

### reading-view-client.tsx (170 lines)
- **Violations**: `bg-primary-600`, `bg-neutral-*`, raw `<button>`, no Card
- **Target**: `Card` for content area, `Button` for actions, theme tokens

### study-quiz-content.tsx (354 lines)
- **Violations**: `bg-primary/8` non-standard, raw `<button>`, may exceed 200 lines
- **Target**: `Button` for quiz options, `bg-primary/10` for valid opacity, split if over 200 lines

## Related Code Files

- Modify: `src/components/progress-dashboard.tsx`
- Modify: `src/components/dashboard-sidebar.tsx`
- Modify: `src/components/test/test-question-card.tsx`
- Modify: `src/components/test/test-results-screen.tsx`
- Modify: `src/app/(dashboard)/reading/[id]/reading-view-client.tsx`
- Modify: `src/app/(dashboard)/study/study-quiz-content.tsx`
- Reference: `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/progress.tsx`

## Implementation Steps

### progress-dashboard.tsx
1. Add imports: `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/card`; `Button` from `@/components/ui/button`; `Progress` from `@/components/ui/progress`
2. Replace all `bg-primary-600` → `bg-primary`, `text-primary-700` → `text-primary`
3. Replace all `bg-neutral-*` → `bg-muted`, `text-neutral-*` → `text-muted-foreground` or `text-foreground`
4. Wrap stat cards in `Card`/`CardContent`
5. Replace raw `<button>` with `Button variant="outline"` or `variant="ghost"`
6. Use `Progress` component for any progress bar displays

### dashboard-sidebar.tsx
1. Add imports: `Search`, `Bell` from `lucide-react` (check if already imported)
2. Replace inline SVG search icon → `<Search className="..." />`
3. Replace inline SVG bell icon → `<Bell className="..." />`
4. Replace raw `<input>` → `Input` from `@/components/ui/input`

### test-question-card.tsx
1. Add imports: `Card`, `CardContent` from `@/components/ui/card`; `Button` from `@/components/ui/button`
2. Replace `bg-primary-600` → `bg-primary`
3. Replace `text-neutral-*` → `text-muted-foreground` or `text-foreground`
4. Wrap in `Card`/`CardContent`
5. Replace raw `<button>` for answer options with `Button variant="outline"`

### test-results-screen.tsx
1. Add imports: `Card`, `CardContent` from `@/components/ui/card`; `Button` from `@/components/ui/button`
2. Replace `bg-primary-600` → `bg-primary`
3. Replace `bg-neutral-*` → `bg-muted`
4. Wrap in `Card`/`CardContent`
5. Replace raw `<button>` with `Button`

### reading-view-client.tsx
1. Add imports: `Card`, `CardContent` from `@/components/ui/card`; `Button` from `@/components/ui/button`
2. Replace `bg-primary-600` → `bg-primary`
3. Replace `bg-neutral-*` → `bg-muted`
4. Wrap content area in `Card`/`CardContent`
5. Replace raw `<button>` with `Button`

### study-quiz-content.tsx
1. Add import: `Button` from `@/components/ui/button`
2. Fix `bg-primary/8` → `bg-primary/10` (valid Tailwind v4 opacity syntax)
3. Replace raw `<button>` for quiz options with `Button variant="outline"`
4. If file exceeds 200 lines, extract option rendering into `quiz-option-button.tsx`

## Success Criteria

- [ ] Zero `bg-primary-600` or `bg-neutral-*` across all 6 files
- [ ] Zero inline SVGs (all replaced with Lucide)
- [ ] Zero raw `<button>` elements (all use `Button`)
- [ ] Zero raw `<input>` elements (all use `Input`)
- [ ] All files under 200 lines
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

## Risk Assessment

Medium risk — many files touched but changes are mechanical (color token swap, component swap). Main risk: quiz option buttons may have custom styling that doesn't map cleanly to Button variants. Mitigate: use `className` prop on Button for custom styles rather than falling back to raw HTML.
