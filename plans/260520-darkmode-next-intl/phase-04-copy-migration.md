---
phase: 4
title: "Copy Migration"
status: complete
priority: P2
effort: "3h"
dependencies: [2, 3]
---

# Phase 4: Copy Migration

## Overview

Move visible UI copy into English and Vietnamese message files, starting with navigation and high-traffic screens.

## Requirements

- Functional: translate dashboard shell, auth pages, upload/study controls, reading/test labels, progress summary.
- Functional: keep learner-facing English passage content unchanged unless it is UI chrome.
- Non-functional: Vietnamese copy should be natural, concise, and supportive.

## Architecture

Use namespace-based message files:

- `messages/en.json`
- `messages/vi.json`
- Suggested namespaces: `Common`, `Navigation`, `Auth`, `Dashboard`, `Study`, `Upload`, `Reading`, `Test`, `Progress`, `Errors`.

Server Components should use `getTranslations` or `useTranslations` depending on component type. Client Components should use `useTranslations` from `next-intl`.

## Related Code Files

- Modify: `messages/en.json`
- Modify: `messages/vi.json`
- Modify: `src/components/layout/dashboard-sidebar.tsx`
- Modify: `src/components/layout/user-menu.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/app/[locale]/(auth)/sign-in/page.tsx`
- Modify: `src/app/[locale]/(auth)/sign-up/page.tsx`
- Modify: `src/features/study/*`
- Modify: `src/features/upload/*`
- Modify: `src/features/reading/*`
- Modify: `src/features/test/*`
- Modify: `src/features/progress/*`

## Implementation Steps

1. Create message namespace structure and seed English copy from current UI.
2. Add Vietnamese translations.
3. Convert layout/navigation/auth copy first.
4. Convert dashboard and study workspace copy second.
5. Convert reading/test/progress/upload copy third.
6. Keep AI-generated passage/question content as user data, not translated UI.
7. Run a search for remaining hardcoded visible labels.

## Success Criteria

- [x] No primary navigation label is hardcoded.
- [x] Auth and dashboard UI render in both locales.
- [x] Vietnamese strings fit mobile controls without overflow.
- [x] Error/empty/loading states have localized titles and CTAs.
- [x] Formatting uses locale-aware date/number helpers where relevant.

## Risk Assessment

Risk: converting all copy at once creates a large review surface.
Mitigation: migrate by feature namespace and keep behavior changes out of this phase.

Risk: Vietnamese text can be longer than English.
Mitigation: verify mobile top bar, cards, buttons, and dropdown widths.
