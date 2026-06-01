# Performance Tests

Run translate-flow performance coverage with:

```bash
pnpm test:performance
```

The Node benchmark picks a free local port in `3010..3999`, starts `next dev` on `http://127.0.0.1:<port>` with translate metrics enabled, waits for the server, runs the scenarios, and stops the exact server process it started. Set `E2E_BASE_URL` or `PERFORMANCE_BASE_URL` to point at an existing server instead. It uses `E2E_AUTH_COOKIE` / `BENCHMARK_COOKIE` first, then shared E2E auth state from `.auth/user.json`, then signs in with `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` when the storage state is absent. It writes report-only output to `test-results/performance/translate-flow.json`, including aggregate Prisma metrics and per-step Prisma query metrics under `performance.prisma.steps`.
