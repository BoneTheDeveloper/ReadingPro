# Performance Tests

Run all API performance benchmarks with:

```bash
pnpm test:performance
```

Run one suite with:

```bash
pnpm test:performance -- --suite=translate
pnpm test:performance -- --suite=dictionary
```

By default, the benchmark owns its dev server. It starts `next dev` on a free port with:

- `NEXT_DIST_DIR=.next-performance`
- `PRISMA_QUERY_METRICS=1`
- `TRANSLATE_PERFORMANCE_FIXTURES=1`
- `DICTIONARY_PERFORMANCE_FIXTURES=1`

The separate `NEXT_DIST_DIR` prevents the benchmark server from corrupting or blocking the normal `.next` dev server process.

To debug against an already-running server, start it manually with fixture flags:

```bash
pnpm dev:performance
pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000
```

Authentication uses `E2E_AUTH_COOKIE` / `BENCHMARK_COOKIE` first, then shared E2E auth state from `.auth/user.json`, then signs in with `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` when the storage state is absent.

Reports:

- `test-results/performance/translate-flow.json`
- `test-results/performance/dictionary-flow.json`

Each report includes aggregate Prisma metrics and per-step Prisma query metrics under `performance.prisma.steps`. Dictionary reports split resolve work into finer query groups such as `suggestResolve.headwordPrefix`, `suggestResolve.aliasPrefix`, `lookupResolve.headword`, and `lookupResolve.alias`.
