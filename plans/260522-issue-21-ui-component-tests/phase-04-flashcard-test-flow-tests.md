---
title: "Phase 04 - Flashcard Test Flow Integration Tests"
status: completed
---

# Phase 04 - Flashcard Test Flow Integration Tests

## Goal

Test the flashcard/test view as an integration component flow, from initial question through feedback and final results.

## Tasks

- Use `@testing-library/user-event` for answer clicks, keyboard shortcuts, passage toggles, and result navigation.
- Test `FlashcardTestClient` as the primary integration target: answering questions, keyboard shortcuts for options and Enter, next-question state reset, final results screen, streak changes, passage toggle, source highlight after feedback, and router navigation callbacks.
- Add narrow colocated child component tests for `TestHeader`, `TestPassagePanel`, `TestQuestionCard`, and `TestResultsScreen` only for important visual/branch behavior that is not covered clearly by the full client flow.

## Files Likely To Change

- `__tests__/components/test/flashcard-test-client.integration.test.tsx`
- Optional colocated unit component tests beside individual test-view components only if needed for complicated branches.

## Verification

- Run the test-view integration component tests with `pnpm vitest run`.
- Confirm keyboard events are expressed through `userEvent.keyboard`.

## Acceptance Criteria

- User answer interactions and state transitions are verified from initial question through final results with `userEvent`.
- Source-highlight and feedback behavior are covered.

## Completion Notes

- Added `FlashcardTestClient` integration coverage for click answers, keyboard shortcuts, feedback, next/final state, passage toggle, result accuracy, and navigation.
