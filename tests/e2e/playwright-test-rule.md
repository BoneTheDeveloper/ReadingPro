# Playwright Test Rule

Use this rule whenever adding, changing, or running Playwright tests.

## Rule

- Keep public tests independent of authentication. Public specs must run under the `public` project and must not require `.auth/user.json`, `.env.test`, or E2E credentials.
- Put authenticated browser coverage in `authenticated-*.spec.ts`. Authenticated specs must run under the `authenticated` project and reuse `.auth/user.json` from the `setup` project.
- Keep UI sign-in steps only in `tests/e2e/auth.setup.ts`. Do not duplicate sign-in form automation in feature specs or screenshot specs.
- Use stable user-visible locators for readiness, such as headings, buttons, landmarks, and route-specific content. Avoid relying only on `networkidle`.
- Generated screenshots must use `playwright.screenshot.config.ts`, authenticated storage state, and output under `generated/screenshot/`.
- Prefer `PAGE=` and `NAME=` for screenshot command inputs. Do not use `PATH=` because it conflicts with shell path semantics.
- On host OS versions unsupported by Playwright browser downloads, run E2E and screenshot flows through Docker.

## Verification

Run the cheapest applicable checks before finishing Playwright changes:

```bash
pnpm exec playwright test --list
pnpm exec playwright test --config=playwright.screenshot.config.ts --list
pnpm e2e --project=public
```

Run authenticated and screenshot flows when valid Clerk E2E credentials and a reachable Neon database are available:

```bash
pnpm e2e --project=setup
pnpm e2e --project=authenticated
pnpm e2e:screenshot
make screenshot PAGE=/en/study NAME=study
```

If a browser run cannot be executed, record the exact blocker in the final report.
