---
type: report
topic: nextjs-performance-testing
created: 2026-06-01T21:37:00+07:00
scope: best-practices-and-current-tests-performance-readme
---

# Research Report: Next.js Performance Testing Best Practices

## Table of Contents

- [Executive Summary](#executive-summary)
- [Research Methodology](#research-methodology)
- [Current Repo Performance Tests](#current-repo-performance-tests)
- [Key Findings](#key-findings)
- [Best Practices](#best-practices)
- [Gap Analysis](#gap-analysis)
- [Implementation Recommendations](#implementation-recommendations)
- [Resources & References](#resources--references)
- [Unresolved Questions](#unresolved-questions)

## Executive Summary

Current `tests/performance/README.md` documents an API benchmark harness, not a complete Next.js performance testing strategy. It runs `pnpm test:performance`, starts an owned `next dev --turbopack` server with fixture flags, measures translate/dictionary API scenarios, writes JSON reports, and enforces Prisma query-count budgets. This is good for backend route regression detection.

Best practice for Next.js performance testing needs layers: API/query budgets, production-mode route benchmarks, lab Web Vitals/Lighthouse checks, bundle-size checks, and field/RUM Core Web Vitals. Next.js official docs explicitly recommend testing production builds with `next build` + `next start`, running Lighthouse as a simulated lab check, and pairing that with field Core Web Vitals via `useReportWebVitals`.

Recommendation: keep the current harness, but rename its mental model to "API query-budget benchmark." Add production-mode benchmark support before treating timings as user-facing performance. Add repeated runs and latency budgets before using `roundTripMs` as a CI gate.

## Research Methodology

- Research timestamp: 2026-06-01 21:37 Asia/Ho_Chi_Minh.
- Sources consulted: 8 external primary/authoritative docs plus local repo files.
- Date range: 2024-2026 docs; prioritized docs updated/crawled in 2026.
- Key search terms:
  - `Next.js performance measuring reportWebVitals instrumentation`
  - `Next.js production checklist performance Lighthouse field data`
  - `Next.js OpenTelemetry instrumentation`
  - `Playwright APIRequestContext API testing`
  - `Lighthouse CI performance budgets`
  - `Web Vitals field lab measurement`
- Local files reviewed:
  - `tests/performance/README.md`
  - `tests/performance/run-benchmarks.ts`
  - `tests/performance/benchmark-utils.ts`
  - `tests/performance/translate-flow-benchmark.ts`
  - `tests/performance/dictionary-flow-benchmark.ts`
  - `package.json`

## Current Repo Performance Tests

### What Exists

The repo has a custom TypeScript benchmark runner:

```bash
pnpm test:performance
pnpm test:performance -- --suite=translate
pnpm test:performance -- --suite=dictionary
```

Current behavior:

- Starts owned benchmark server unless `--reuse-server` is used.
- Uses `next dev --turbopack`, not `next start`.
- Isolates dev output with `NEXT_DIST_DIR=.next-performance`.
- Enables fixture-only routes with:
  - `PRISMA_QUERY_METRICS=1`
  - `TRANSLATE_PERFORMANCE_FIXTURES=1`
  - `DICTIONARY_PERFORMANCE_FIXTURES=1`
- Loads `.env.local` and `.env.test`.
- Uses auth cookie from `E2E_AUTH_COOKIE` / `BENCHMARK_COOKIE`, then shared E2E auth state, then E2E credentials.
- Creates and cleans test fixtures through test-only API routes.
- Performs one warm-up request per suite and discards it.
- Writes JSON reports:
  - `test-results/performance/translate-flow.json`
  - `test-results/performance/dictionary-flow.json`

### What It Measures

Translate suite:

- Scenarios: `single-word-dictionary`, `phrase-dictionary`, `fallback`, `cache-repeat`.
- Validates selected word count, context word count, resolution source, route timings, Prisma query totals, Prisma step metrics.
- Has hard/soft query-count budgets.

Dictionary suite:

- Scenarios: short suggest, headword prefix, alias prefix, exact search, headword lookup, alias lookup, miss lookup.
- Validates phase, result correctness, route timings, Prisma query totals, Prisma step metrics.
- Has hard query-count budgets.

### What It Does Not Measure

- Production build/runtime behavior.
- Browser rendering, hydration, RSC streaming, route navigation, INP, LCP, CLS, FCP, TBT.
- Bundle size regressions.
- p50/p95/p99 latency across repeated samples.
- CI trend history.
- Load/concurrency behavior.
- Real-user field data.

## Key Findings

### 1. Next.js Performance Testing Is Layered

Next.js production guidance points to several performance surfaces: Server Components, code-splitting, prefetching, prerendering, caching, route rendering choices, data fetching, streaming, and bundle analysis. A single API benchmark cannot cover these. Source: Next.js production checklist, updated March 31, 2026.

### 2. Production Mode Matters

Next.js docs recommend running `next build` and then `next start` before production to catch build issues and measure production-like performance. The current harness uses `next dev --turbopack`, which is practical for local fixture testing but not equivalent to production runtime.

### 3. Lab Data And Field Data Serve Different Jobs

Official Web Vitals docs distinguish lab checks from field measurements. Lab tools help catch regressions before release, but field data is needed to know real user experience. Lighthouse cannot measure INP in lab and uses TBT as a proxy.

### 4. Budgets Are Correct, But Too Narrow Today

The current query budgets are valuable because they catch accidental N+1 database regressions. MDN frames performance budgets as limits that prevent regressions and can target timing, quantity, rule, or custom metrics. This repo currently has quantity budgets for Prisma query counts; it should add timing and bundle budgets.

### 5. Instrumentation Should Feed Observability

Next.js supports `instrumentation.ts|js` for server instrumentation and `useReportWebVitals` for client Web Vitals reporting. OpenTelemetry docs describe local testing with a collector and mention verbose Next.js spans via `NEXT_OTEL_VERBOSE=1`.

## Best Practices

### Recommended Test Pyramid

```text
Field / RUM
  Core Web Vitals from real users: LCP, INP, CLS

Release / CI lab checks
  Lighthouse CI, bundle budgets, production smoke flows

Targeted server benchmarks
  API route timings, DB query counts, cache behavior, repeated samples

Unit/integration checks
  Pure logic, data access, caching contracts
```

### Practical Rules

1. Use production mode for user-facing performance gates.
   - Build with `next build`.
   - Serve with `next start`.
   - Run route/browser benchmarks against that server.

2. Keep dev-server benchmarks only for targeted diagnostics.
   - Current fixture-driven API tests are fine for query budgets.
   - Do not use dev-server `roundTripMs` as a product latency SLA.

3. Measure both server work and browser experience.
   - Server/API: route timing, DB query count, DB duration, cache hit source.
   - Browser/lab: LCP, CLS, TBT, FCP, navigation timing.
   - Field/RUM: LCP, INP, CLS at 75th percentile.

4. Use budgets as gates.
   - Hard gate: query counts, obvious bundle limits, severe Lighthouse regressions.
   - Soft gate: latency while baseline is noisy.
   - Promote soft to hard after collecting stable history.

5. Repeat samples and report percentiles.
   - Warm up first.
   - Run each scenario 5-10 times.
   - Store min, median, p95, max.
   - Gate on median/p95, not one sample.

6. Isolate fixture data.
   - Keep test-only fixture routes disabled by default.
   - Require explicit env flags.
   - Clean up IDs created by the benchmark.

7. Track trends, not just pass/fail.
   - Persist JSON artifacts in CI.
   - Compare against baseline branch or last successful main run.
   - Show diffs in PRs.

8. Add bundle analysis.
   - Use Next.js bundle analyzer / Turbopack bundle analyzer where applicable.
   - Gate large dependency regressions before they become Web Vitals regressions.

9. Add Web Vitals reporting.
   - Use `useReportWebVitals` for app-level reporting.
   - Keep client boundary isolated to a tiny Web Vitals component.

10. Add OpenTelemetry for server traces if route timing becomes hard to debug.
   - Use `instrumentation.ts`.
   - Test locally with an OpenTelemetry collector.

## Gap Analysis

| Area | Current State | Risk | Recommendation |
|---|---|---:|---|
| API query budgets | Present | Low | Keep; this is the strongest current layer. |
| API latency budgets | Captured but not gated | Medium | Add repeated samples and soft p95 budgets. |
| Production-mode benchmark | Missing | High | Add `--server-mode=production` or separate script. |
| Browser Web Vitals lab | Missing | High | Add Lighthouse CI or Playwright + browser metrics for key routes. |
| Field Web Vitals | Missing | High | Add `useReportWebVitals` or managed RUM. |
| Bundle budgets | Missing | Medium | Add bundle analyzer artifact and CI budget. |
| CI history | Unknown from README | Medium | Persist `test-results/performance/*.json`. |
| Load/concurrency | Missing | Medium later | Add only after single-user budgets stabilize. |
| Fixture route security | Good flags, needs documentation | Medium | Document flags must never be enabled in prod. |

## Implementation Recommendations

### Quick Start

1. Update README wording:
   - Call current tests "API performance/query-budget benchmarks."
   - State explicitly: runs against `next dev --turbopack`; not production-mode Web Vitals testing.

2. Add repeated samples:

```ts
type ScenarioStats = {
  samples: number[];
  min: number;
  median: number;
  p95: number;
  max: number;
};
```

3. Add latency budgets as soft gates first:

```ts
const LATENCY_BUDGETS = {
  "lookup-exact-headword": { p95RoundTripMs: 250, gate: "soft" },
  "single-word-dictionary": { p95RoundTripMs: 500, gate: "soft" },
};
```

4. Add a production benchmark mode:

```bash
pnpm build
PRISMA_QUERY_METRICS=1 \
TRANSLATE_PERFORMANCE_FIXTURES=1 \
DICTIONARY_PERFORMANCE_FIXTURES=1 \
pnpm start

pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000
```

5. Add Lighthouse CI after production mode works:

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://127.0.0.1:3000/en",
        "http://127.0.0.1:3000/en/dictionary"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended"
    }
  }
}
```

6. Add field Web Vitals:

```tsx
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    navigator.sendBeacon("/api/analytics/web-vitals", JSON.stringify(metric));
  });
}
```

### Common Pitfalls

- Treating `next dev` timings as production truth.
- Gating CI on one latency sample.
- Measuring Lighthouse without production build.
- Ignoring field data because lab scores are green.
- Enabling fixture/test metric routes in production.
- Tracking only total request time and missing query-count regressions.
- Adding load tests before stabilizing deterministic single-user benchmarks.

## Resources & References

### Official / Primary Docs

- Next.js Analytics and `useReportWebVitals`: https://nextjs.org/docs/app/guides/analytics
- Next.js Production Checklist: https://nextjs.org/docs/app/guides/production-checklist
- Next.js Instrumentation: https://nextjs.org/docs/app/guides/instrumentation
- Next.js OpenTelemetry: https://nextjs.org/docs/app/guides/open-telemetry
- Next.js `distDir`: https://nextjs.org/docs/pages/api-reference/config/next-config-js/distDir
- Web Vitals overview: https://web.dev/articles/vitals
- Web Vitals measurement guide: https://web.dev/articles/vitals-measurement-getting-started
- MDN Performance Budgets: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Performance_budgets
- Lighthouse CI configuration: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- Playwright APIRequestContext: https://playwright.dev/docs/api/class-apirequestcontext

## Unresolved Questions

- Should performance CI run against a real production build, or only nightly due build/start cost?
- Which user-facing pages are the first Lighthouse/Web Vitals targets?
- What latency budgets are realistic for local dev, CI, and deployed environments?
- Should report artifacts be compared against `main` or fixed static budgets?
