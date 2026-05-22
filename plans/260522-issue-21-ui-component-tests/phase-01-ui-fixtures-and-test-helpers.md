---
title: "Phase 01 - UI Fixtures, User Event, and Test Helpers"
status: planned
---

# Phase 01 - UI Fixtures, User Event, and Test Helpers

## Goal

Prepare shared UI-facing fixtures and minimal test helpers so integration component tests stay readable and reuse the existing test infrastructure.

## Tasks

- Add fixture builders for UI prop shapes derived from `passageFixture` and `generatedQuestionsFixture`.
- Cover reading props, study passage/document props, study result items, test passage props, and test question props.
- Add `@testing-library/user-event` as a dev dependency if it is not already present.
- Add a lightweight UI test helper only if repeated `userEvent.setup()` or render setup appears in multiple files.
- Document or encode the preferred pattern for mocking router pushes, `fetch`, `react-dropzone`, and study server actions.
- Use `__tests__/components/` or another focused `__tests__/` subtree for integration component tests.
- Use colocated tests beside source files for unit-style component, hook, and utility tests only.

## Files Likely To Change

- `__tests__/fixtures/article.ts`
- `__tests__/fixtures/flashcard.ts`
- `__tests__/fixtures/index.ts`
- Optional: `__tests__/helpers/ui.tsx`
- Optional: `__tests__/helpers/index.ts`
- `__tests__/components/`
- `package.json`
- `pnpm-lock.yaml`

## Verification

- Run the smallest relevant Vitest target after adding helpers.
- Confirm `@testing-library/user-event` resolves in a component test.
- Confirm helpers import cleanly from at least one smoke or component test.

## Acceptance Criteria

- UI component tests can import shared props without duplicating large object literals.
- Fixtures remain deterministic and do not require live DB, Supabase, AI, or network access.
- User interactions are driven through `userEvent`, with `fireEvent` reserved only for low-level cases that user-event cannot express cleanly.
- Test placement follows the repo rule: integration/API/smoke/infrastructure tests in `__tests__`; unit component/hook/util tests colocated with source.
