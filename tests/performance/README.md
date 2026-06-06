# Performance Tests

API performance and query-budget benchmarks for the translate and dictionary
flows. Each run produces both JSON and Markdown reports under
`test-results/performance/`.

## Quick Start

Run all benchmarks:

```bash
pnpm test:performance
```

Run a single flow:

```bash
pnpm test:performance -- --suite=translate
pnpm test:performance -- --suite=dictionary
```

Override sample count (default: 10):

```bash
pnpm test:performance -- --samples=5
```

## Reports

Every run writes:

- `test-results/performance/translate-flow.json` + `.md`
- `test-results/performance/dictionary-flow.json` + `.md`

JSON contains raw benchmark data. Markdown renders summary tables with budget
status, latency stats (min / median / p95 / max), and per-scenario step
timings.

Regenerate Markdown from existing JSON without rerunning:

```bash
pnpm test:performance:report
```

## Budget Policy

**Query-count budgets** are hard gates. A hard-budget failure exits non-zero.

**Latency budgets** are soft warnings (median and p95). They log to console and
reports but do not fail the process while baselines stabilize.

## Server Modes

By default the benchmark owns its dev server (`next dev --turbopack` on a free
port) with:

- `NEXT_DIST_DIR=.next-performance`
- `PRISMA_QUERY_METRICS=1`
- `TRANSLATE_PERFORMANCE_FIXTURES=1`
- `DICTIONARY_PERFORMANCE_FIXTURES=1`

These variables are benchmark-only. Do not add them to normal local app env or
production runtime env.

## Environment Inputs

| Variable | Purpose |
|----------|---------|
| `NEXT_DIST_DIR` | Isolates benchmark-owned Next.js output from the normal `.next` directory. |
| `PRISMA_QUERY_METRICS` | Enables query-count instrumentation required by benchmark assertions. |
| `TRANSLATE_PERFORMANCE_FIXTURES` | Enables authenticated translate fixture setup/cleanup routes outside production. |
| `DICTIONARY_PERFORMANCE_FIXTURES` | Enables authenticated dictionary fixture setup/cleanup routes outside production. |
| `PERFORMANCE_BASE_URL` | Points benchmarks at an existing app when `--base-url` is not passed. |
| `E2E_BASE_URL` | Fallback external app URL shared with Playwright. |
| `E2E_AUTH_COOKIE` | Auth cookie used for authenticated benchmark requests. |
| `BENCHMARK_COOKIE` | Alternate auth cookie used by benchmark runs. |

### Reuse an existing server

```bash
pnpm dev:performance
pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000
```

### Test against a production build

```bash
pnpm build:performance
pnpm start:performance
pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000
```

## Query Budget Details

Full route-level budget tables and uncovered routes are tracked in
[query-budget-benchmarks.md](./query-budget-benchmarks.md).
