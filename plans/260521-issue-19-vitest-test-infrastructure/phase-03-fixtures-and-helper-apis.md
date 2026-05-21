# Phase 3: Fixtures and Helper APIs

## Goal

Create reusable fixtures and helper APIs that match this application's domain instead of forcing each test to invent ad hoc data.

## Work Items

- Create `__tests__/fixtures/user.ts`:
  - authenticated user profile fixture.
  - Supabase auth user fixture.
  - unauthenticated/null user helper.
- Create `__tests__/fixtures/article.ts`:
  - passage/article fixture with CEFR fields.
  - generated question list fixture.
  - upload/content analysis result fixture.
- Create `__tests__/fixtures/flashcard.ts`:
  - card-review fixture.
  - due-card fixture.
  - study-session fixture.
- Create `__tests__/helpers/db.ts`:
  - reset all DB mocks.
  - seed common mock return values.
  - assert no unexpected DB writes when useful.
- Create `__tests__/helpers/api.ts`:
  - JSON request builder for route handlers.
  - form-data/file request helpers for upload routes.
  - response JSON parsing helper.
- Create `__tests__/helpers/assertions.ts`:
  - domain assertions for API success/error payloads.
  - shared helpers for question and passage shapes.
- Export fixtures/helpers through simple index files where helpful, without creating a large abstraction layer.

## Acceptance Checks

- Test authors can import fixtures from `__tests__/fixtures/*`.
- Test authors can import helper APIs from `__tests__/helpers/*`.
- Helpers remain TypeScript-friendly and avoid any live DB, Supabase, or AI calls.
