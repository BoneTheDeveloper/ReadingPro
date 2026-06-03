---
phase: 5
title: "Lighthouse And Web Vitals Follow-up"
status: completed
priority: P3
effort: "2h plan, implementation later"
dependencies: [4]
---

# Phase 5: Lighthouse And Web Vitals Follow-up

## Overview

Define the next performance layer after API benchmarks are stable. This phase should not block immediate benchmark hardening.

## Requirements

- Functional: choose candidate pages for lab checks.
- Functional: decide whether Lighthouse CI or Playwright browser metrics is first.
- Functional: sketch field Web Vitals capture without implementing analytics storage.
- Non-functional: avoid adding noisy CI checks before production-mode API benchmark works.

## Architecture

Recommended sequence after Phase 4:

```text
Production API benchmark
  -> Lighthouse CI on public/low-auth pages
  -> authenticated Playwright performance smoke if needed
  -> Web Vitals RUM endpoint when analytics target is chosen
```

Candidate lab pages:

- `/en`
- `/en/dictionary`
- authenticated study page only if auth setup is stable

Candidate metrics:

- Lighthouse: performance score, LCP, CLS, TBT, FCP.
- Field/RUM later: LCP, INP, CLS at 75th percentile.

## Related Code Files

- Maybe create: `lighthouserc.json`
- Maybe modify: `package.json`
- Maybe create: `src/components/web-vitals.tsx`
- Maybe create: `src/app/api/analytics/web-vitals/route.ts`

## Implementation Steps

1. Decide first Lighthouse target routes.
2. Decide CI mode:
   - PR only
   - nightly
   - manual local command
3. Define initial non-blocking Lighthouse assertions.
4. Decide where field Web Vitals should be sent:
   - Sentry
   - custom API route
   - external analytics provider
5. Create a separate implementation plan for Lighthouse/Web Vitals once decisions are made.

## Success Criteria

- [x] Follow-up scope is documented.
- [x] No Lighthouse/Web Vitals implementation is mixed into API benchmark hardening.
- [x] First target routes and metric policy are known before implementation.

## Risk Assessment

Medium risk if implemented too early. Lighthouse can become noisy, and authenticated route measurements are easy to make brittle. Defer implementation until Phase 4 proves production benchmark flow.
