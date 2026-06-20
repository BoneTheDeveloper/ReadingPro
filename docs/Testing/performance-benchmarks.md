## Summary

- Query-count budgets are hard gates where marked in the canonical benchmark doc.
- Latency budgets are currently soft warnings while baselines stabilize.
- Benchmark reports are written under `test-results/performance/`.
- Performance diagnostics are enabled through explicit environment flags and benchmark routes.
- Shared auth/storage helpers come from `tests/shared/`; performance code must not import from `playwright/`.

## Commands

```bash
pnpm test:performance
pnpm test:performance:report
pnpm dev:performance
pnpm build:performance
pnpm start:performance
```
