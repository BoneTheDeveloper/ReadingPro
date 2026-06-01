# Playwright E2E and Screenshots

Playwright uses one pre-created Supabase Auth user for authenticated browser tests. The test run signs in through the UI once, saves `.auth/user.json`, and reuses that storage state for protected routes and generated screenshots.

E2E specs and helpers live under `tests/e2e/`. Performance test scenarios should live under `tests/performance/`.

## Local Environment

The app reads Supabase and database settings from `.env.local`. Playwright additionally loads `.env.test` for the E2E user credentials:

```bash
E2E_TEST_USER_EMAIL=reader@example.com
E2E_TEST_USER_PASSWORD=secure-password
```

The user must already exist in the Supabase project referenced by `.env.local`. Playwright does not create users automatically. `pnpm e2e:create-user` and `make e2e-setup` are manual helper commands for maintainers who intentionally want to create that user with `SUPABASE_SERVICE_ROLE_KEY`.

## Commands

```bash
pnpm e2e --project=setup
pnpm e2e --project=public
pnpm e2e --project=authenticated
pnpm e2e
pnpm e2e:screenshot
make screenshot PAGE=/en/study NAME=study
```

- `setup` signs in and writes `.auth/user.json`.
- `public` runs without `.auth/user.json` or E2E credentials.
- `authenticated` depends on `setup` and reuses `.auth/user.json`.
- `pnpm e2e:screenshot` writes `generated/screenshot/study-screenshot.png` by default.
- `make screenshot` runs the screenshot flow in Docker and mounts `generated/screenshot` back to the host.

If your host OS is not supported by Playwright browser downloads, such as Ubuntu 26.04 with the current Playwright version, use the Docker-backed commands:

```bash
pnpm e2e:docker
make screenshot PAGE=/en/study NAME=study
```

## CI Requirements

GitHub Actions pins `ubuntu-24.04` so Playwright can install Chromium on a supported runner. It runs Playwright only when all required secrets are present:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL
DIRECT_URL
E2E_TEST_USER_EMAIL
E2E_TEST_USER_PASSWORD
```

When secrets are missing, CI prints a skip notice and keeps lint, typecheck, unit tests, and coverage unchanged. When secrets are present, CI installs Chromium, runs `pnpm db:migrate:deploy`, then runs `pnpm e2e`.

The configured Supabase database must be safe for CI migration deployment and the E2E user must already exist before the Playwright job starts.
