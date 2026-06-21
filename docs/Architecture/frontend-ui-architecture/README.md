# Frontend UI Architecture

Screen-level UI contract for agents changing pages. This README owns the app shell,
cross-cutting UI rules, and the page index. Composition mechanics and the component
inventory each have their own guide; the visual language (tokens, color, type, motion)
lives in [../../Design/design.md](../../Design/design.md).

## Folder Layout

```text
frontend-ui-architecture/
+-- README.md                        index + app shell + UI rules (this file)
+-- page-composition-conventions.md  how pages are composed
+-- component-catalog.md             reusable component inventory
+-- pages/                           one doc per screen
```

| Doc | Use it for |
|-----|------------|
| [page-composition-conventions.md](page-composition-conventions.md) | Composition shape, feature-folder layout, route / page-client / hook / service / API-boundary rules, cross-feature capability rules, page-doc template. |
| [component-catalog.md](component-catalog.md) | Primitives, layout chrome, and feature components: variants, states, anatomy, when to use each. |
| [pages/](pages/) | A single screen: route, rendering boundary, layout, state and data, UI states. See [Page Inventory](#page-inventory). |

## Overview

The frontend is a server-first Next.js App Router shell with feature-owned Client
Components for interactive screens. Code lives under `src/features/<feature>/`:

- `ui` — components, panels, page clients
- `hooks` — React hooks (`use-*.ts`)
- `model` — types, schemas, pure state logic
- `api-client` — client fetch wrappers

Reusable primitives live in `src/ui/primitives`.

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

Global locale layout (`layout.tsx`):

- Validate the locale against `routing.locales`.
- Load next-intl messages.
- Provide Clerk, theme, and next-intl providers.
- Register Inter, Literata, and JetBrains Mono font variables.
- Keep the body full-height and overflow-hidden so pages own their scroll regions.

Dashboard layout:

- Wrap pages with `DashboardSidebar`.
- Provide the icon rail, mobile drawer, top bar, search, language switcher, theme toggle, and auth controls.
- Keep content in a `flex-1` main area with `min-h-0` so panels scroll internally.

## Global UI Rules

Cross-cutting rules for every dashboard screen. Composition mechanics (where state,
components, and services go) belong to
[page-composition-conventions.md](page-composition-conventions.md).

- Keep pages quiet, dense, and content-first.
- Reach for `src/ui/primitives` before adding custom primitives.
- Use Lucide icons for icon buttons, source types, and feature actions.
- Keep browser-only state in Client Components or feature hooks.
- Load authenticated data in Server Component route entries or server actions.
- Keep passage text at a readable line length; do not stretch it across wide screens.
- Prefer page-local scrolling over body scrolling.

## Page Inventory

| Route | Role | Doc |
|-------|------|-----|
| `/[locale]` | Dashboard home: study stats, next action, recent reading, quick actions. | [dashboard-page.md](pages/dashboard-page.md) |
| `/[locale]/study` | Three-panel study workspace: sources, reader, studio, chat, quizzes, translation, upload modal. | [study-page.md](pages/study-page.md) |
| `/[locale]/upload` | Transitional standalone upload / text entry; target is a thin wrapper or disabled route. | [upload-page.md](pages/upload-page.md) |
| `/[locale]/processing` | Transitional upload-processing progress screen. | [processing-page.md](pages/processing-page.md) |
| `/[locale]/dictionary` | Dictionary lookup: suggestions, entry details, save-to-vocabulary. | [dictionary-page.md](pages/dictionary-page.md) |
| `/[locale]/vocabulary` | Vocabulary management: words and sets tabs. | [vocabulary-page.md](pages/vocabulary-page.md) |
| `/[locale]/progress` | Redirect stub to dashboard home. | [progress-page.md](pages/progress-page.md) |
| `/[locale]/sign-in`, `/[locale]/sign-up` | Clerk-hosted auth screens in a branded centered shell. | [auth-pages.md](pages/auth-pages.md) |

## Current Mismatches

- `src/features/upload` and the Study upload modal overlap. Target: keep reusable upload under `src/features/upload` and Study-specific source UI under `src/features/study/ui/upload`. Boundary owned by [page-composition-conventions.md](page-composition-conventions.md#cross-feature-capability-rules).
- Dashboard home uses mock data in `src/app/[locale]/page.tsx`; do not treat it as live progress data until it reads real user stats.
- `/[locale]/progress` redirects to `/` and does not render `src/features/progress/progress-dashboard.tsx`.

## Related Code

- Dashboard shell: `src/ui/layout/dashboard-sidebar.tsx`
- Locale layout: `src/app/[locale]/layout.tsx`
