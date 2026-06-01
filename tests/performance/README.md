# Performance Tests

Run translate-flow performance coverage with:

```bash
pnpm test:performance
```

The Node benchmark starts the dev server on `http://127.0.0.1:3010` with translate metrics enabled unless `E2E_BASE_URL` or `PERFORMANCE_BASE_URL` points at an existing server. It uses `E2E_AUTH_COOKIE` / `BENCHMARK_COOKIE` first, then shared E2E auth state from `.auth/user.json`, then signs in with `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` when the storage state is absent. It writes report-only output to `test-results/performance/translate-flow.json`.
