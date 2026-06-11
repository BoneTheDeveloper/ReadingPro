# Dashboard Page

## Route

Route:

`/[locale]`

Route file:

`src/app/[locale]/page.tsx`

Root component:

`DashboardPage`

## Purpose

Dashboard home summarizes study momentum and routes the learner into the next useful action. It currently uses mock stats and mock recent passages.

## Layout

The page wraps itself in `DashboardSidebar` and renders a scrollable dashboard surface.

```text
DashboardPage
+-- DashboardSidebar
    +-- Hero and next action
    +-- Progress cards
    +-- Recent reading list
    +-- Momentum or mastery side panels
    +-- Quick actions
```

## Main Regions

Hero:

- Large primary surface with localized greeting.
- Momentum copy based on mock stats.
- Primary CTA to the next action.
- Secondary CTA to study room.

Next action card:

- Contextual card for due reviews, first upload, deck building, review streak, or low-pressure reading.
- Uses semantic tone classes for high-priority, setup, and calm states.

Progress cards:

- Reviews due.
- Current streak.
- Today.
- Reading library, when passages exist.

Recent reading:

- List of recent mock passages.
- Each item links to `/study`.
- Shows title, CEFR level, excerpt, word count, and date.

Quick actions:

- Review queue.
- Add reading.
- Generate questions.

## Data Boundary

This page is a Server Component, but the current implementation uses in-file mock data:

- `mockDashboardProfile`
- `mockStats`
- `mockPassageOverview`

Do not treat these values as real user data. When replacing mocks, keep authenticated data loading in the server page or a server-side service.

## UI Rules

- Dashboard is allowed to use larger summary cards than tool pages.
- Keep the top CTA actionable and route most study work to `/study`.
- Preserve dense, scannable cards rather than a marketing landing-page layout.
- Do not introduce body scrolling outside the dashboard content region.
