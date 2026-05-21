# Phase 2: Global Test Setup and Mocks

## Goal

Provide deterministic mock modules for the external and noisy boundaries found by GKG: logger, AI SDK/OpenAI, Prisma DB, Sentry, Supabase, Next navigation/headers, and next-intl.

## Work Items

- Create `__tests__/setup/vitest.setup.ts` for:
  - `@testing-library/jest-dom/vitest`.
  - cleanup after tests if needed.
  - shared mock reset hooks.
- Create `__tests__/mocks/logger.ts`:
  - no-op `logger`.
  - `createModuleLogger` returning mockable `debug/info/warn/error` functions.
- Create `__tests__/mocks/gemini.ts` or AI mock module:
  - helpers for `generateObject` responses.
  - helpers for `streamText` response objects.
  - model factory stubs for OpenAI/Gemini-compatible imports.
- Create `__tests__/mocks/db.ts`:
  - Prisma-shaped `db` mock for the models used in current code: `userProfile`, `passage`, `question`, `cardReview`, `studySession`.
  - reset helper to clear mock implementations between tests.
- Add lightweight mocks for:
  - `@sentry/nextjs`, especially `startSpan`, `withServerActionInstrumentation`, `captureException`, and `logger`.
  - `next/headers` for `headers()` and `cookies()`.
  - `next/navigation` router helpers.
  - `next-intl` translation hooks.
  - Supabase client/server factories when auth UI or auth utilities are tested.

## Acceptance Checks

- A smoke test can mock `@/lib/db/client` and call reset helpers.
- A smoke test can import AI modules without hitting real model providers.
- React component tests can render components that use router and i18n hooks.
