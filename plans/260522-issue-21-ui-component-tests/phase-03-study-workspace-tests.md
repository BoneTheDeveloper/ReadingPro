---
title: "Phase 03 - Study Workspace Integration Tests"
status: completed
---

# Phase 03 - Study Workspace Integration Tests

## Goal

Cover the study workspace with integration component tests first, using child component tests only where a branch is not practical to reach through the composed workspace.

## Tasks

- Use `@testing-library/user-event` for source selection, search input, modal opening, paste-text submission, content mode switching, studio actions, chat/result navigation, and collapse toggles.
- Add `StudyPageClient` integration tests that render initial passages and verify source/content/studio behavior through real child panels.
- Cover source search/filtering, selecting documents, upload modal access, paste-text upload flow, empty state, and upload indicator through workspace or panel-level integration tests.
- Defer direct file/dropzone upload coverage.
- Cover content empty state, simplifying state, simplified/original toggle, simplify callback for eligible levels, error display, and non-simplifiable A1/A2 path.
- Cover studio disabled state without active passage, enabled action callbacks, running/result states, completed result drill-in, chat view, back navigation, collapsed mode, and concurrency lock behavior.
- Test `StudyChatPanel` directly only as a tiny render branch if the chat integration path does not assert the title/copy clearly.
- Mock `react-resizable-panels` in the `StudyPageClient` test if jsdom layout behavior makes the composed test brittle.

## Files Likely To Change

- `__tests__/components/study/study-page-client.integration.test.tsx`
- Optional colocated unit component tests beside study components only for complicated branches not covered by integration tests.

## Verification

- Run the study component test files with `pnpm vitest run`.
- Watch for flaky timer or `Date.now()` behavior in relative-time result assertions.

## Acceptance Criteria

- Study workspace behavior is covered primarily through feature-level integration tests using shared fixtures.
- Child components have colocated narrow unit tests only for important branches not easily reached through the composed workspace.
- Upload modal coverage uses paste-text mode for now; file/dropzone coverage is explicitly deferred.

## Completion Notes

- Added `StudyPageClient` integration coverage for empty state, source filtering/selection, paste-text upload, simplify flow, non-simplifiable A2 path, quiz result drill-in, and chat view.
- Mocked `react-resizable-panels`, `react-dropzone`, and study server actions at the component boundary.
