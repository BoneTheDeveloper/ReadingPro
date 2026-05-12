---
phase: 2
title: "Update CLAUDE.md rules"
status: pending
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Update CLAUDE.md rules

## Overview

Add strict shadcn/ui + Tailwind CSS 4 styling rules to `docs/code-standards.md` and update `CLAUDE.md` conventions section so future development cannot regress. Rules must be specific enough to catch violations in code review but concise enough to actually read.

## Requirements

- Rules cover: color tokens, shadcn primitives, forbidden patterns, icon usage, hover handling
- Rules reference the CSS variable token table from plan.md
- Examples of FORBIDDEN vs CORRECT patterns included
- No duplication with existing rules — extend, don't rewrite

## Architecture

Two files updated:
1. `docs/code-standards.md` — expand "Styling" section (currently 6 lines, lines 77-84)
2. `CLAUDE.md` — add "Styling Rules" to Conventions section

## Related Code Files

- Modify: `docs/code-standards.md` — expand Styling section
- Modify: `CLAUDE.md` — add styling conventions
- Reference: `src/app/globals.css` — CSS variable definitions (source of truth for tokens)

## Implementation Steps

1. **Update `docs/code-standards.md` Styling section** — Replace the 6-line section (lines 77-84) with expanded rules:
   - Color tokens table mapping CSS variables to Tailwind classes
   - FORBIDDEN list: hardcoded hex, Tailwind v3 syntax (`bg-primary-600`, `bg-neutral-*`), inline `style={{}}` for static values
   - REQUIRED: use shadcn primitives (Button, Input, Card, Dialog, etc.) instead of raw HTML equivalents
   - REQUIRED: Lucide icons instead of inline SVGs
   - REQUIRED: Tailwind `hover:` instead of `onMouseEnter`/`onMouseLeave` JS handlers
   - REQUIRED: `cn()` for conditional classes, never string concatenation
   - Before/after examples for each rule

2. **Update `CLAUDE.md` Conventions section** — Add a "Styling Rules" subsection:
   - One-line summary pointing to `docs/code-standards.md` for full rules
   - Quick-reference FORBIDDEN list
   - shadcn primitive inventory (12 components)

3. **Add "What Not To Do" entries** in code-standards.md (lines 166-173 area):
   - Don't use `bg-primary-600` or `bg-neutral-*` — use `bg-primary`, `bg-muted`, etc.
   - Don't use hardcoded hex colors in JSX — use CSS variable tokens
   - Don't use inline SVGs when Lucide has an equivalent icon
   - Don't use raw `<button>`/`<input>` when shadcn Button/Input exist

## Success Criteria

- [ ] `docs/code-standards.md` Styling section expanded with token table, forbidden list, and examples
- [ ] `CLAUDE.md` has Styling Rules subsection in Conventions
- [ ] "What Not To Do" section includes 4 new shadcn-specific entries
- [ ] Rules reference `globals.css` as source of truth for token values
- [ ] `npm run build` still passes (no accidental changes to code)

## Risk Assessment

Low risk — documentation only. Ensure no code changes accidentally slip in.
