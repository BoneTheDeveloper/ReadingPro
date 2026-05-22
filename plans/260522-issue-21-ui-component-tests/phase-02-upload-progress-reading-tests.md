---
title: "Phase 02 - Upload, Progress, and Reading Integration Tests"
status: planned
---

# Phase 02 - Upload, Progress, and Reading Integration Tests

## Goal

Add focused integration component tests for the issue's explicitly named upload/progress components and the reading client view.

## Tasks

- Use `@testing-library/user-event` for typing, clicking, and navigation-triggering interactions.
- Test `TextInputArea` as a paste-and-submit flow: default render, word count updates, validation error, disabled/processing button states, and successful submit.
- Test `ProgressDashboard` as a fetch-to-render flow: loading state, successful stats render using one clear expected stats property contract, due-review CTA, caught-up state, fetch failure fallback, and router navigation clicks. If the test reveals a component/API contract error, leave the failing signal clear and fix it after.
- Test `ReadingViewClient` as a reading mode flow: metadata render, simplified/original toggle, no-simplified fallback, question-count messaging, and router navigation for back/test actions.

## Files Likely To Change

- `__tests__/components/upload/text-input-area.integration.test.tsx`
- `__tests__/components/progress/progress-dashboard.integration.test.tsx`
- `__tests__/components/reading/reading-view-client.integration.test.tsx`
- Optional colocated unit component tests only if integration coverage becomes awkward for a specific branch.

## Verification

- Run the three new integration test files with `pnpm vitest run`.
- Confirm no unmocked fetch/router side effects leak between tests.

## Acceptance Criteria

- Default render, custom props, interactions, state changes, loading/error states, and applicable accessibility assertions are covered through user-facing flows.
