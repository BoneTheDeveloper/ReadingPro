---
title: "Migrate all components to shadcn/ui + Tailwind CSS 4 conventions"
description: "Refactor all UI components to use shadcn primitives consistently, eliminate inline styles, and align color tokens with the Tailwind v4 CSS variable theme system."
status: pending
priority: P2
branch: "main"
tags: ["refactor", "ui", "shadcn", "tailwind", "design-system"]
blockedBy: []
blocks: []
created: "2026-05-12T02:51:57.002Z"
createdBy: "ck:plan"
source: skill
---

# Migrate all components to shadcn/ui + Tailwind CSS 4 conventions

## Overview

Audit found ~15 components with shadcn violations: inline styles with hardcoded hex colors (~50 instances in study-upload-modal alone), 60+ raw `<button>` elements where `Button` exists, raw `<input>` in search bars, inconsistent color tokens (mix of CSS variable tokens and Tailwind v3 `bg-primary-600`), missing shadcn primitives, inline SVGs instead of Lucide, and JS hover handlers instead of Tailwind `hover:`.

**Theme:** Project uses `base-nova` style with CSS variable tokens (`--primary: #3b5ce4`). All colors MUST reference these tokens — never hardcoded hex.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Install shadcn primitives](./phase-01-install-shadcn-primitives.md) | Pending |
| 2 | [Update CLAUDE.md rules](./phase-02-update-claude-md-rules.md) | Pending |
| 3 | [Fix HIGH severity components](./phase-03-fix-high-severity-components.md) | Pending |
| 4 | [Fix MEDIUM severity components](./phase-04-fix-medium-severity-components.md) | Pending |
| 5 | [Fix LOW severity components](./phase-05-fix-low-severity-components.md) | Pending |
| 6 | [Cleanup and verify](./phase-06-cleanup-and-verify.md) | Pending |

## shadcn Component Reference (latest docs)

| Component | Install | Exports |
|-----------|---------|---------|
| **Dialog** | `npx shadcn@latest add dialog` | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogTrigger`, `DialogClose` |
| **Tabs** | `npx shadcn@latest add tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| **Progress** | `npx shadcn@latest add progress` | `Progress` (already exists in project) |
| **Tooltip** | `npx shadcn@latest add tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent` |
| **Separator** | `npx shadcn@latest add separator` | `Separator` (supports `orientation="vertical"`) |
| **Sheet** | `npx shadcn@latest add sheet` | `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetTrigger`, `SheetClose`, `SheetFooter` |
| **Textarea** | `npx shadcn@latest add textarea` | `Textarea` |

## Color Token Mapping

The project theme (`globals.css :root`) defines these CSS variables. Use ONLY these Tailwind classes:

| CSS Variable | Tailwind Class | Hex Value |
|-------------|---------------|-----------|
| `--primary` | `bg-primary`, `text-primary` | `#3b5ce4` |
| `--primary-foreground` | `text-primary-foreground` | `#ffffff` |
| `--secondary` | `bg-secondary`, `text-secondary` | `#5a72f0` |
| `--accent` | `bg-accent`, `text-accent` | `#f0f3ff` |
| `--muted` | `bg-muted`, `text-muted` | `#e7eeff` |
| `--muted-foreground` | `text-muted-foreground` | `#454652` |
| `--destructive` | `bg-destructive`, `text-destructive` | `#ba1a1a` |
| `--border` | `border-border` | `#d8e3fb` |
| `--foreground` | `text-foreground` | `#111c2d` |
| `--background` | `bg-background` | `#f9f9ff` |

**FORBIDDEN:** `bg-primary-600`, `bg-neutral-*`, `text-primary-700`, `#185FA5`, `#378ADD`, any hardcoded hex.

## Dependencies

None — this is a standalone refactor with no cross-plan dependencies.
