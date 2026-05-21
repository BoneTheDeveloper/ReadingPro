# Phase 1: Dependencies and Vitest Config

## Goal

Install the requested testing dependencies and create the minimum Vitest configuration needed for this Next/React/TypeScript app.

## Work Items

- Add dev dependencies:
  - `vitest`
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `@vitejs/plugin-react`
  - `jsdom`
  - `@vitest/coverage-v8`
- Add package scripts:
  - `test`: run Vitest once.
  - `test:watch`: run Vitest watch mode.
  - `test:coverage`: run Vitest with coverage.
- Create `vitest.config.ts` with:
  - React plugin.
  - `test.environment = "jsdom"`.
  - setup file registration.
  - `@` alias to `src`.
  - v8 coverage provider and useful default reporters.
  - test include patterns for `__tests__` and colocated `*.test.ts(x)` files.
- Verify TypeScript accepts the config under the current `moduleResolution: "bundler"` setup.

## Acceptance Checks

- `pnpm install` updates `pnpm-lock.yaml`.
- `pnpm test -- --run` starts Vitest without config errors.
- `@/*` imports resolve inside a smoke test.
