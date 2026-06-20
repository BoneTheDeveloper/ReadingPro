# Frontend UI Architecture

## Overview

The frontend uses a server-first Next.js App Router shell with feature-owned Client Components for interactive screens. Product UI code lives under `src/features/<feature>/ui`, React hooks live under `src/features/<feature>/hooks`, types and state logic live under `src/features/<feature>/model`, client fetch wrappers live under `src/features/<feature>/api-client`, and reusable primitives live under `src/ui/primitives`.

Use this folder as the screen-level UI architecture contract for agents changing pages. Use [../../Design/design-guidelines.md](../../Design/design-guidelines.md) for the broader visual language.

## App Shell

All user-facing routes are locale-prefixed under `src/app/[locale]`.

```text
src/app/[locale]
+-- layout.tsx
+-- page.tsx
+-- (auth)
|   +-- sign-in
|   +-- sign-up
+-- (dashboard)
    +-- layout.tsx
    +-- study
    +-- upload
    +-- processing
    +-- dictionary
    +-- vocabulary
    +-- progress
```

Global locale layout responsibilities:

- Validate the locale against `routing.locales`.
- Load next-intl messages.
- Provide Clerk, theme, and next-intl providers.
- Register Inter, Literata, and JetBrains Mono font variables.
- Keep the body full-height and overflow-hidden so dashboard pages own their scroll regions.

Dashboard layout responsibilities:

- Wrap dashboard pages with `DashboardSidebar`.
- Provide desktop icon rail, mobile drawer, top bar, search input, language switcher, theme toggle, and auth controls.
- Keep page content inside a `flex-1` main area with `min-h-0` so panels can scroll internally.

## Global UI Rules

- Keep dashboard pages quiet, dense, and content-first.
- Use shadcn-style primitives from `src/ui/primitives` before adding custom primitives.
- Use Lucide icons for icon buttons, source types, and feature actions.
- Keep browser-only state inside Client Components or feature hooks.
- Keep authenticated data loading in Server Component route entries or server actions.
- Preserve readable line lengths for passage content; do not stretch reading text across wide screens.
- Prefer page-local scrolling inside the dashboard shell instead of body scrolling.

## Composition Convention

Use [page-composition-conventions.md](page-composition-conventions.md) when adding or refactoring pages.

Default hierarchy:

```text
Route page
+-- Page client
    +-- Page layout regions
        +-- Feature components
            +-- Shared UI primitives
```

The short rule: keep `page.tsx` thin, use one root page client for interactive pages, compose major product regions from the page client, move reusable browser behavior into feature hooks, and keep durable domain logic in `src/server/modules`.

Shared capability rule: reusable upload code belongs under `src/features/upload`, while Study-specific upload composition belongs under `src/features/study/ui/upload`. The standalone `/upload` route is optional and should not own the canonical upload architecture.

## Page Inventory

| Route | Current role | Detail doc |
|-------|--------------|------------|
| `/[locale]` | Dashboard home with mock study stats, next action, recent reading, progress cards, and quick actions. | [dashboard-page.md](dashboard-page.md) |
| `/[locale]/study` | Main three-panel study workspace for sources, reader, studio actions, chat, quizzes, translation, and upload modal. | [study-page.md](study-page.md) |
| `/[locale]/upload` | Transitional standalone upload/text entry page; target direction is thin wrapper or disabled route. | [upload-page.md](upload-page.md) |
| `/[locale]/processing` | Transitional upload-processing progress screen. | [processing-page.md](processing-page.md) |
| `/[locale]/dictionary` | Authenticated dictionary lookup page with suggestions, entry details, and vocabulary save actions. | [dictionary-page.md](dictionary-page.md) |
| `/[locale]/vocabulary` | Authenticated vocabulary management page with words and sets tabs. | [vocabulary-page.md](vocabulary-page.md) |
| `/[locale]/progress` | Redirect stub to dashboard home. | [progress-page.md](progress-page.md) |
| `/[locale]/sign-in`, `/[locale]/sign-up` | Clerk-hosted auth screens inside a branded centered auth shell. | [auth-pages.md](auth-pages.md) |

## Current Mismatches

- `src/features/upload` and Study upload modal currently overlap. Target direction: keep upload as a shared capability under `src/features/upload`, and keep Study-specific source creation UI under `src/features/study/ui/upload`.
- Dashboard home uses mock data in `src/app/[locale]/page.tsx`; do not document it as live progress data until the page reads real user stats.
- `/[locale]/progress` redirects to `/` and does not render `src/features/progress/progress-dashboard.tsx`.

## Related Code

- Dashboard shell: `src/ui/layout/dashboard-sidebar.tsx`
- Locale layout: `src/app/[locale]/layout.tsx`
