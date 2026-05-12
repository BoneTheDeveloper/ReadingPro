---
phase: 1
title: "Install shadcn primitives"
status: pending
priority: P1
effort: "30min"
dependencies: []
---

# Phase 1: Install shadcn primitives

## Overview

Install the 6 missing shadcn/ui primitives that components will need after migration: Dialog, Tabs, Tooltip, Separator, Sheet, Textarea. Progress already exists.

## Requirements

- All 6 components installed via `npx shadcn@latest add`
- No modifications to generated files in `src/components/ui/`
- Verify each component renders without errors

## Architecture

shadcn CLI copies component source into `src/components/ui/`. These are atom-level primitives — app components compose them, never modify them.

## Related Code Files

- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/sheet.tsx`
- Create: `src/components/ui/textarea.tsx`
- Existing: `src/components/ui/button.tsx` (already exists)
- Existing: `src/components/ui/input.tsx` (already exists)
- Existing: `src/components/ui/card.tsx` (already exists)
- Existing: `src/components/ui/badge.tsx` (already exists)
- Existing: `src/components/ui/progress.tsx` (already exists)
- Existing: `src/components/ui/dropdown-menu.tsx` (already exists)
- Existing: `src/components/ui/avatar.tsx` (already exists)

## Implementation Steps

1. Run `npx shadcn@latest add @shadcn/dialog @shadcn/tabs @shadcn/tooltip @shadcn/separator @shadcn/sheet @shadcn/textarea` — installs all 6 primitives in one command
2. Verify `npm run build` passes — no type errors from new components
3. Verify each file exists in `src/components/ui/`

## Success Criteria

- [ ] `src/components/ui/dialog.tsx` exists and exports Dialog primitives
- [ ] `src/components/ui/tabs.tsx` exists and exports Tabs primitives
- [ ] `src/components/ui/tooltip.tsx` exists and exports Tooltip primitives
- [ ] `src/components/ui/separator.tsx` exists and exports Separator
- [ ] `src/components/ui/sheet.tsx` exists and exports Sheet primitives
- [ ] `src/components/ui/textarea.tsx` exists and exports Textarea
- [ ] `npm run build` passes with no new errors
- [ ] Total shadcn primitives in `src/components/ui/`: 13 (7 existing + 6 new)

## Risk Assessment

Low risk — shadcn CLI is well-tested. Only risk is dependency conflicts, mitigated by running build check.
