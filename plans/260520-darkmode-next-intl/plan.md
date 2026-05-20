---
title: "Dark Mode and English Vietnamese Locale Switch"
description: "Add a calm dark-mode system and English/Vietnamese locale switching using next-intl without breaking Supabase auth routing."
status: complete
priority: P2
effort: 14h
branch: "main"
tags: [feature, frontend, i18n]
blockedBy: []
blocks: []
created: "2026-05-20"
createdBy: "ck:plan"
source: skill
---

# Dark Mode and English Vietnamese Locale Switch

## Overview

Implement manual/system dark mode plus English/Vietnamese UI copy using `next-intl`. Keep the reading-first editorial tone, preserve existing Tailwind 4/shadcn token usage, and compose locale routing with the existing Supabase auth proxy.

## Cross-Plan Dependencies

No active unfinished project plans found under `plans/*/plan.md`.

## Scope Challenge

- Existing code: `src/app/globals.css` already has Tailwind 4 custom variants and design tokens; `src/proxy.ts` already handles Supabase auth redirects; layout controls live in `src/components/layout`.
- Minimum changes: add `next-intl` and `next-themes`, introduce locale routing/messages, add theme and language controls, migrate visible UI copy incrementally.
- Complexity: routing affects many route files because App Router pages move under `[locale]`; plan uses phased migration to reduce risk.
- Selected mode: HOLD SCOPE. No CMS translations, no database-stored language preference, no RTL, no localized route slugs.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Theme Design Tokens](./phase-01-theme-design-tokens.md) | Complete |
| 2 | [Next Intl Routing](./phase-02-next-intl-routing.md) | Complete |
| 3 | [Theme And Locale Controls](./phase-03-theme-and-locale-controls.md) | Complete |
| 4 | [Copy Migration](./phase-04-copy-migration.md) | Complete |
| 5 | [Validation](./phase-05-validation.md) | Complete |

## Dependencies

- `next-intl`: locale routing, messages, navigation wrappers.
- `next-themes`: class-based dark mode, system preference support.
- Existing `src/proxy.ts`: must continue Supabase session refresh and protected route redirects.
- Design references:
  - `docs/Design/design-guidelines.md`
  - `docs/Design/darkmode-color-design.md`
  - `docs/Design/dark-mode-i18n-next-intl-plan.md`
