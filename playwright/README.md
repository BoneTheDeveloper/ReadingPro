# Playwright Local Playground

This folder contains the local Playwright playground for E2E smoke checks and authenticated screenshots. Keep Playwright-specific config, specs, helpers, Docker files, rules, and result-path decisions here instead of the root README.

## Layout

```text
playwright/
  playwright.config.ts
  playwright.screenshot.config.ts
  Dockerfile
  docker-compose.yml
  helpers/
  tests/
```

Performance benchmark scenarios stay under `tests/performance/`; they are not part of this Playwright playground.

## Local Environment

The app reads Clerk and database settings from `.env.local`. Playwright additionally loads `.env.test` for the local E2E user:

```bash
E2E_TEST_USER_EMAIL=reader@example.com
E2E_TEST_USER_PASSWORD=secure-password
```

The user must exist in the Clerk development instance referenced by `.env.local`. Create it manually or run:

```bash
pnpm e2e:create-user
```

## Commands

```bash
pnpm e2e --project=setup
pnpm e2e --project=public
pnpm e2e --project=authenticated
pnpm e2e
pnpm e2e:screenshot
make screenshot PAGE=/en/study NAME=study
```

Docker fallback:

```bash
pnpm e2e:docker
make screenshot PAGE=/en/study NAME=study
```

## Rules

- Keep public tests independent of authentication. Public specs must run under the `public` project and must not require `.auth/user.json`, `.env.test`, or E2E credentials.
- Put authenticated browser coverage in `authenticated-*.spec.ts`. Authenticated specs must run under the `authenticated` project and reuse `.auth/user.json` from the `setup` project.
- Keep UI sign-in steps only in `playwright/tests/auth.setup.ts`. Do not duplicate sign-in form automation in feature specs or screenshot specs.
- Use stable user-visible locators for readiness, such as headings, buttons, landmarks, and route-specific content. Avoid relying only on `networkidle`.
- Keep all Playwright-generated results under `test-results/playwright/`.
- HTML reports go to `test-results/playwright/report/`.
- Traces, videos, and failure screenshots go to `test-results/playwright/artifacts/`.
- Manual screenshots must use `playwright/playwright.screenshot.config.ts`, authenticated storage state, and output under `test-results/playwright/screenshots/`.
- Prefer `PAGE=` and `NAME=` for screenshot command inputs. Do not use `PATH=` because it conflicts with shell path semantics.
- On host OS versions unsupported by Playwright browser downloads, run E2E and screenshot flows through Docker.

## Result Layout

```text
test-results/
  playwright/
    report/       # Playwright HTML report
    artifacts/    # traces, videos, failure screenshots
    screenshots/  # manually requested screenshots
  performance/    # non-Playwright benchmark reports
```

`test-results/` is ignored by git. Do not write Playwright output to `playwright-report/` or `generated/screenshot/`.

## Verification

Run the cheapest applicable checks before finishing Playwright changes:

```bash
pnpm exec playwright test --config=playwright/playwright.config.ts --list
pnpm exec playwright test --config=playwright/playwright.screenshot.config.ts --list
pnpm e2e --project=public
```

Run authenticated and screenshot flows only when valid Clerk E2E credentials and a reachable Neon database are available:

```bash
pnpm e2e --project=setup
pnpm e2e --project=authenticated
pnpm e2e:screenshot
make screenshot PAGE=/en/study NAME=study
```

If a browser run cannot be executed, record the exact blocker in the final report.
