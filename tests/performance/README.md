# Performance Tests

These are API performance and query-budget benchmarks for the translate and
dictionary flows. They are designed to catch API regressions such as extra
Prisma queries, missing fixture behavior, and route timing changes.

They are not full Next.js user-experience performance tests. By default they
run against `next dev --turbopack`, so they do not measure production runtime,
browser rendering, hydration, bundle size, Lighthouse scores, Core Web Vitals,
or load/concurrency behavior.

Run all API performance benchmarks with:

```bash
pnpm test:performance
```

Run one suite with:

```bash
pnpm test:performance -- --suite=translate
pnpm test:performance -- --suite=dictionary
```

Run more or fewer samples per scenario with:

```bash
pnpm test:performance -- --samples=10
pnpm test:performance -- --suite=dictionary --samples=1
```

## Benchmark Modes

By default, the benchmark owns its dev server. It starts `next dev --turbopack`
on a free port with:

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

To collect timings against a production build, build and start the isolated
performance server, then reuse it from the benchmark runner:

```bash
pnpm build:performance
pnpm start:performance
pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000 --samples=5
```

The production path uses `NEXT_DIST_DIR=.next-performance-production` so it does
not overwrite the normal `.next` output. Keep this flow opt-in until fixture
routes and timing baselines are stable enough for CI.

Authentication uses `E2E_AUTH_COOKIE` / `BENCHMARK_COOKIE` first, then shared E2E auth state from `.auth/user.json`, then signs in with `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` when the storage state is absent.

Use these benchmarks before and after changes to:

- `/api/translate`
- `/api/dictionary/*`
- Prisma dictionary lookup queries
- translation cache reads/writes
- translation history writes
- benchmark fixture routes or metric collection

## Budget Policy

Query-count budgets are the hard performance gate. A hard query-budget failure
exits non-zero.

Latency budgets are provisional soft warnings based on sampled `median` and
`p95` round-trip stats. Soft latency failures are written to the console and the
JSON report, but do not fail the process while CI timing baselines are still
being established. Hard latency gates should only be enabled after production
mode has a stable baseline.

Do not use the default dev-server timing as a production latency SLA. Run the benchmark against a production build before making production latency claims.

Reports:

- `test-results/performance/translate-flow.json`
- `test-results/performance/translate-flow.md`
- `test-results/performance/dictionary-flow.json`
- `test-results/performance/dictionary-flow.md`

The JSON reports preserve the raw benchmark data. The Markdown reports render
the same results as readable summary tables with budget status, latency stats,
and per-scenario route/Prisma step timings.

Each report includes aggregate Prisma metrics, `queryBudget`, `queryPassed`,
`latencyBudget`, `latencyPassed`, `latencyFailures`, per-step Prisma query
metrics under `performance.prisma.steps`, raw round-trip samples, and `min` /
`median` / `p95` / `max` round-trip stats. Dictionary reports split resolve work
into finer query groups such as `suggestResolve.headwordPrefix`,
`suggestResolve.aliasPrefix`, `lookupResolve.headword`, and
`lookupResolve.alias`.

Regenerate Markdown from existing JSON artifacts without rerunning the benchmark:

```bash
pnpm test:performance:report
pnpm test:performance:report -- test-results/performance/translate-flow.json
```

## Field Web Vitals

Real-user Core Web Vitals (LCP, CLS, INP, FCP, TTFB) are collected via
`@vercel/speed-insights` and viewable in the Vercel dashboard under
**Speed Insights**. This is independent from the API benchmarks above and
complements Sentry's automatic performance tracing.

Enable Speed Insights in the Vercel dashboard, then deploy. Metrics appear
after real-user traffic hits the deployed site.

## Follow-up Performance Scope

The next performance layer should stay separate from this API benchmark. Start
with Lighthouse CI on public or low-auth pages such as `/en` and
`/en/dictionary`, using non-blocking assertions for performance score, LCP, CLS,
TBT, and FCP. Add authenticated Playwright browser performance smoke tests only
after auth setup is stable. Field Web Vitals should track LCP, INP, and CLS at
the 75th percentile once the analytics destination is chosen.
