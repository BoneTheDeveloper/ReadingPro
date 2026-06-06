# Performance Benchmarks

## Canonical Rule Docs

Performance benchmark implementation and budget policy live under `tests/performance/`:

- [../../tests/performance/README.md](../../tests/performance/README.md)
- [../../tests/performance/query-budget-benchmarks.md](../../tests/performance/query-budget-benchmarks.md)

This file exists so the main docs tree can point readers to performance testing without copying benchmark tables.

## Summary

- Query-count budgets are hard gates where marked in the canonical benchmark doc.
- Latency budgets are currently soft warnings while baselines stabilize.
- Benchmark reports are written under `test-results/performance/`.
- Performance diagnostics are enabled through explicit environment flags and benchmark routes.

## Commands

```bash
pnpm test:performance
pnpm test:performance:report
pnpm dev:performance
pnpm build:performance
pnpm start:performance
```

