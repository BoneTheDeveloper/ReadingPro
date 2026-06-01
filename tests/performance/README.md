# Performance Tests

Run API performance coverage with:

```bash
pnpm dev:performance
```

Then in another terminal:

```bash
pnpm test:performance
```

The benchmark reuses an already-running server. By default it targets `http://localhost:3000`; set `PERFORMANCE_BASE_URL` to override that. It does not start or stop `next dev`.

The dev server must be started with the performance fixture flags. Use:

```bash
pnpm dev:performance
```

Authentication uses `E2E_AUTH_COOKIE` / `BENCHMARK_COOKIE` first, then shared E2E auth state from `.auth/user.json`, then signs in with `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` when the storage state is absent.

Reports:

- `test-results/performance/translate-flow.json`
- `test-results/performance/dictionary-flow.json`

Each report includes aggregate Prisma metrics and per-step Prisma query metrics under `performance.prisma.steps`.
