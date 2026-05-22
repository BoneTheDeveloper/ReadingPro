---
title: "Issue 21 UI Component Tests"
description: "Add integration-oriented React Testing Library coverage for major UI flows across upload, progress, reading, study, and test views."
status: approved
priority: P1
effort: 8h
branch: "feature/21-ui-component-tests"
issue: "https://github.com/BoneTheDeveloper/english-reading-training-app/issues/21"
tags: ["testing", "vitest", "react-testing-library", "ui", "gkg"]
blockedBy: []
blocks: []
created: "2026-05-22"
createdBy: "ck:cook"
source: skill
---

# Issue 21 UI Component Tests

## Overview

Issue #21 asks for React UI component tests that verify rendering, user interactions, state changes, loading/error states, and accessibility assertions where applicable. The implementation will prioritize integration component tests: render real feature-level components with their child components, interact through the UI with `@testing-library/user-event`, and mock only framework/external boundaries such as router, fetch, dropzone, and server actions.

Current branch: `feature/21-ui-component-tests`.

## Issue Scope

- `src/features/upload/text-input-area.tsx`
- `src/features/progress/progress-dashboard.tsx`
- Client components in reading, study, and test views:
  - `src/features/reading/reading-view-client.tsx`
  - `src/features/study/study-page-client.tsx`
  - `src/features/study/study-left-panel.tsx`
  - `src/features/study/study-content-panel.tsx`
  - `src/features/study/study-right-panel.tsx`
  - `src/features/study/study-chat-panel.tsx`
  - `src/features/study/study-upload-modal.tsx`
  - `src/features/test/flashcard-test-client.tsx`
  - `src/features/test/test-header.tsx`
  - `src/features/test/test-passage-panel.tsx`
  - `src/features/test/test-question-card.tsx`
  - `src/features/test/test-results-screen.tsx`

## GKG Findings

GKG MCP was used to map `src/features/upload`, `src/features/progress`, `src/features/reading`, `src/features/study`, `src/features/test`, `__tests__`, and shared component directories. The exposed GKG tools did not include the `index_project` command referenced by `AGENT.md`, so the available repo-map and definition tools were used, with direct file reads for component bodies where the index did not expose React component definitions.

| Area | Relevant Files | Testing Needs |
|------|----------------|---------------|
| Test setup | `vitest.config.ts`, `__tests__/setup/vitest.setup.ts` | Already configured for jsdom, React plugin, jest-dom, cleanup, Next router/navigation mocks, next-intl mock, Supabase/DB/AI/Sentry mocks. |
| Fixtures | `__tests__/fixtures/article.ts`, `__tests__/fixtures/flashcard.ts`, `__tests__/fixtures/user.ts` | Extend or adapt passage/question fixtures into UI-facing props for reading, study, and test components. |
| Helpers | `__tests__/helpers/api.ts`, `__tests__/helpers/assertions.ts`, `__tests__/helpers/db.ts` | Add a small UI render/user helper only if repeated setup becomes noisy. Install and use `@testing-library/user-event`. |
| Upload UI | `text-input-area.tsx`, `study-upload-modal.tsx` | Prefer flow tests around paste-text interactions, validation, disabled/processing state, and success/error callbacks. Defer direct dropzone file-mode coverage. |
| Progress UI | `progress-dashboard.tsx` | Mock `fetch` and router; test the fetch-to-render flow against one clear current stats property contract, due-review/caught-up branches, navigation clicks, and fetch failure fallback. Fix any discovered contract bug later. |
| Reading UI | `reading-view-client.tsx` | Test the user flow for reading metadata, simplified/original mode switching, missing simplified content path, and test navigation. |
| Study UI | `study-page-client.tsx` plus child panels | Prefer `StudyPageClient`/panel integration tests for selecting sources, filtering, upload modal access, content view switching, simplify action, studio actions, result viewing, and chat view. Use isolated child tests only for branches that are awkward or brittle in the composed workspace. |
| Test UI | `flashcard-test-client.tsx` plus child panels | Prefer `FlashcardTestClient` integration tests covering answer selection, keyboard shortcuts, feedback, next/final state, passage toggle/highlight, result accuracy, and navigation. Use child tests for narrow presentational branches if needed. |
| External boundaries | `next/navigation`, `next-intl`, `react-dropzone`, server actions, `fetch` | Existing global mocks cover Next/i18n; add local mocks for `fetch`, `react-dropzone`, and study upload action where component behavior depends on them. |

## Testing Strategy

- Use React Testing Library, `@testing-library/user-event`, and `@testing-library/jest-dom` assertions.
- Prefer user-visible queries (`getByRole`, `getByText`, labels, placeholder text) over implementation details.
- Put unit-style component, hook, and utility tests next to the source file they cover.
- Put integration tests, API tests, smoke tests, and test infrastructure tests under `__tests__/`.
- Use shared fixtures from `__tests__/fixtures`; add small UI fixture builders for prop shapes that differ from DB fixture shapes.
- Mock external boundaries at the component edge: router, fetch, `react-dropzone`, and server actions.
- Avoid testing shadcn primitives themselves; assert the behavior exposed by project components.
- Include accessibility-oriented assertions for buttons, disabled states, progress indicators, checkbox roles, dialog content, and keyboard interaction paths where practical.
- Bias assertions toward complete user flows and visible state changes rather than exhaustive prop-by-prop component unit coverage.
- Prioritize integration tests. Add colocated unit component tests only when a component has enough internal branching or edge cases that integration coverage would become awkward or brittle.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [UI Fixtures, User Event, and Test Helpers](./phase-01-ui-fixtures-and-test-helpers.md) | Planned |
| 2 | [Upload, Progress, and Reading Integration Tests](./phase-02-upload-progress-reading-tests.md) | Planned |
| 3 | [Study Workspace Integration Tests](./phase-03-study-workspace-tests.md) | Planned |
| 4 | [Flashcard Test Flow Integration Tests](./phase-04-flashcard-test-flow-tests.md) | Planned |
| 5 | [Coverage, Flake Cleanup, and Verification](./phase-05-coverage-and-verification.md) | Planned |

## Acceptance Criteria Mapping

- All major UI flows have integration component tests: phases 2, 3, and 4.
- Major child components have colocated unit component tests only where their important behavior cannot be covered cleanly through the feature-level integration test.
- User interactions simulated and verified: phases 2, 3, and 4.
- State changes verified: all component phases cover local state transitions, loading/error displays, and final states.
- Error/loading states covered: progress dashboard, upload modal, content panel, studio running/error results, text validation.
- Accessibility assertions where applicable: phase 1 helper guidance, then each component phase includes role/disabled/keyboard assertions.
- Tests use shared fixtures from test infrastructure: phase 1 creates or documents UI fixture builders based on existing shared fixtures.
- Tests use `@testing-library/user-event` for click, input, keyboard, and upload-like user interactions.

## Risks and Notes

- `ProgressDashboard` currently expects `stats.dueCards`, `matureCards`, and `todayReviews`, while existing API route tests use `dueToday` and `reviewedToday`. Integration tests should use one clear current property contract; if that exposes a bug, fix it after the test makes the failure explicit.
- `StudyUploadModal` calls a server action and `react-dropzone`; initial integration coverage should use paste-text mode only. Direct file/dropzone mode can be added later.
- `StudyPageClient` depends on `react-resizable-panels` and custom hooks. Prefer testing composed user-visible behavior lightly and covering detailed behavior in child component tests.
- Some UI strings come from the global next-intl mock as translation keys. Tests should assert stable keys for translated study UI and literal strings for non-i18n components.

## Review Gate

Plan created on 2026-05-22. Reviewed and approved on 2026-05-22.

Approved implementation decisions:

- Prioritize integration component tests over isolated component unit tests.
- Use `@testing-library/user-event` for user interactions.
- Place integration component tests, API tests, smoke tests, and test infrastructure tests under `__tests__/`.
- Place unit component, hook, and utility tests colocated beside source files only when they add useful coverage for complicated branches.
- Cover `StudyUploadModal` through paste-text mode for now; defer direct file/dropzone coverage.
- Write `ProgressDashboard` tests against one clear current stats property contract; if a component/API mismatch appears, fix it after the test exposes it clearly.
