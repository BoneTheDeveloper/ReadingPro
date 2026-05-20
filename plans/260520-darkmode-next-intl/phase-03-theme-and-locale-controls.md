---
phase: 3
title: "Theme And Locale Controls"
status: complete
priority: P2
effort: "3h"
dependencies: [1, 2]
---

# Phase 3: Theme And Locale Controls

## Overview

Add accessible controls for theme and language switching in the dashboard shell and account menu.

## Requirements

- Functional: user can select Light, Dark, or System theme.
- Functional: user can switch English/Vietnamese without losing the current route.
- Functional: preferences persist through `next-themes` and locale cookie/path behavior.
- Non-functional: controls stay compact and calm; no marketing copy or explanatory blocks in the app UI.

## Architecture

- Add `src/components/theme-provider.tsx` around app children with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `disableTransitionOnChange`.
- Add `src/components/layout/theme-toggle.tsx` using lucide icons.
- Add `src/components/layout/language-switcher.tsx` using `useLocale`, `usePathname`, and locale-aware router APIs.
- Place desktop controls in `TopBar`; place mobile controls in `MobileSidebarContent` or `UserMenu`.
- Keep controls token-based and accessible with labels/tooltips.

## Related Code Files

- Create: `src/components/theme-provider.tsx`
- Create: `src/components/layout/theme-toggle.tsx`
- Create: `src/components/layout/language-switcher.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/dashboard-sidebar.tsx`
- Modify: `src/components/layout/user-menu.tsx`

## Implementation Steps

1. Install `next-themes`.
2. Add the theme provider and wrap app body content.
3. Add theme toggle with mounted-state guard to avoid hydration mismatch.
4. Add language switcher preserving pathname/search where feasible.
5. Replace hardcoded control labels with translation keys.
6. Add `aria-label`, keyboard focus states, and touch target checks.

## Success Criteria

- [x] Theme choice persists across reloads.
- [x] System mode follows OS preference.
- [x] Locale switch keeps equivalent page path.
- [x] Controls are keyboard reachable and screen-reader named.
- [x] No hydration warnings in dev console.

## Risk Assessment

Risk: `useTheme` renders before mount and causes mismatched icons.
Mitigation: render a stable placeholder until mounted.

Risk: switching locales from dynamic routes can lose IDs.
Mitigation: build switcher around the current localized pathname, not static menu labels only.
