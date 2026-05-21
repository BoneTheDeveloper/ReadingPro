# Vitest Infrastructure

The project uses Vitest for unit and smoke tests.

## Commands

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## CI

GitHub Actions runs `.github/workflows/ci.yml` on pull requests and pushes to `main` or `master`. The workflow installs dependencies with pnpm, then runs lint, TypeScript, tests, and coverage.

## Test Layout

- `vitest.config.ts` configures jsdom, React, v8 coverage, and the `@/*` alias.
- `__tests__/setup/vitest.setup.ts` loads jest-dom matchers and registers global mocks.
- `__tests__/mocks/` contains deterministic mocks for DB, AI SDK, OpenAI, Supabase, Sentry, logger, Next headers/navigation, and next-intl.
- `__tests__/fixtures/` contains domain fixtures for users, passages, questions, card reviews, and study sessions.
- `__tests__/helpers/` contains reusable helpers for DB mock setup, API request creation, response parsing, and domain assertions.
- `__tests__/smoke/` verifies the infrastructure works without live providers or database access.

## Notes

- Import production modules normally with `@/*`; the setup file replaces external boundaries.
- Keep smoke tests small. Feature-level coverage should live beside the feature or in focused `__tests__` files.
- Coverage output is generated in `coverage/` and is ignored by Git and ESLint.
