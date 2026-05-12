---
phase: 5
title: "Fix LOW severity components"
status: pending
priority: P3
effort: "2h"
dependencies: [4]
---

# Phase 5: Fix LOW severity components

## Overview

Refactor 5 LOW severity components: `test-header.tsx`, `test-passage-panel.tsx`, `sign-out-button.tsx`, `error-boundary.tsx`, `page.tsx` (landing). These have minor violations — a few v3 color tokens, raw buttons, duplicated sidebar code.

## Requirements

- Replace v3 color syntax with theme tokens
- Replace raw `<button>` with shadcn `Button` where appropriate
- Landing page: extract or share sidebar instead of duplicating from dashboard-sidebar
- Acceptable exceptions: `error-boundary.tsx` raw button (fallback UI), dynamic inline styles

## Architecture

### test-header.tsx (47 lines)
- **Violations**: `bg-primary-600`, inline `style={{ width }}` for progress bar
- **Target**: `bg-primary-600` → `bg-primary`. Keep `style={{ width }}` — it's a dynamic calculated value (acceptable exception)

### test-passage-panel.tsx (71 lines)
- **Violations**: `bg-neutral-*` instead of theme tokens
- **Target**: `bg-neutral-*` → `bg-muted`, `text-neutral-*` → `text-muted-foreground`

### sign-out-button.tsx (19 lines)
- **Violations**: Raw `<button>` instead of shadcn Button
- **Target**: `Button variant="ghost"` with sign-out handler

### error-boundary.tsx (57 lines)
- **Violations**: Raw `<button>` for "Try again"
- **Decision**: KEEP raw `<button>` — error boundary is a fallback UI that must work even if shadcn fails to load. Add a comment explaining this exception.

### page.tsx (181 lines, landing page)
- **Violations**: Duplicated sidebar code from dashboard-sidebar.tsx
- **Target**: Import and reuse `DashboardSidebar` or extract shared sidebar component. Replace any v3 color tokens.

## Related Code Files

- Modify: `src/components/test/test-header.tsx`
- Modify: `src/components/test/test-passage-panel.tsx`
- Modify: `src/components/sign-out-button.tsx`
- Modify: `src/components/error-boundary.tsx` (add exception comment only)
- Modify: `src/app/page.tsx`
- Read: `src/components/dashboard-sidebar.tsx` — understand sidebar for landing page dedup

## Implementation Steps

### test-header.tsx
1. Replace `bg-primary-600` → `bg-primary`
2. Keep `style={{ width: `${percentage}%` }}` — dynamic value, acceptable inline style
3. Verify progress bar still renders correctly

### test-passage-panel.tsx
1. Replace `bg-neutral-*` → `bg-muted`
2. Replace `text-neutral-*` → `text-muted-foreground` or `text-foreground`
3. Verify passage text still readable

### sign-out-button.tsx
1. Add import: `Button` from `@/components/ui/button`
2. Replace raw `<button>` → `<Button variant="ghost" onClick={...}>`
3. Preserve existing onClick handler and sign-out logic

### error-boundary.tsx
1. Add comment above raw `<button>`: `{/* Raw button intentional — error boundary must work if shadcn fails to load */}`
2. No other changes needed

### page.tsx (landing)
1. Check if `DashboardSidebar` can be imported and reused (verify it doesn't require auth context)
2. If reusable: import `DashboardSidebar` and replace duplicated sidebar markup
3. If not reusable (auth dependency): extract shared nav links into a separate component
4. Replace any `bg-neutral-*` or v3 color tokens with theme tokens
5. Ensure landing page still works without authentication

## Success Criteria

- [ ] Zero `bg-primary-600` or `bg-neutral-*` across all modified files
- [ ] `sign-out-button.tsx` uses shadcn `Button`
- [ ] `error-boundary.tsx` has exception comment for raw button
- [ ] Landing page sidebar is not duplicated (imports shared component or extracted)
- [ ] Dynamic inline styles preserved where appropriate (progress bars, calculated widths)
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

## Risk Assessment

Low risk — small files, mechanical changes. Main risk: landing page sidebar dedup may require handling auth/no-auth rendering difference. Mitigate: check if DashboardSidebar already handles unauthenticated state gracefully before importing.
