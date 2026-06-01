---
phase: 4
title: "Production Mode Benchmark"
status: completed
priority: P2
effort: "4h"
dependencies: [2]
---

# Phase 4: Production Mode Benchmark

## Overview

Support running the same API benchmark against a production Next.js build. This makes route timing more meaningful than dev-server timings.

## Requirements

- Functional: provide a documented production benchmark path.
- Functional: preserve existing dev-server default for fast local diagnostics.
- Functional: keep fixture flags explicit.
- Functional: keep auth behavior unchanged.
- Non-functional: avoid corrupting normal `.next` dev/build output.

## Architecture

Two acceptable implementations:

Option A, script-driven:

```json
"test:performance:prod": "..."
```

Option B, runner option:

```bash
pnpm test:performance -- --server-mode=production
```

Recommended first cut: keep runner simple and document manual/reuse flow:

```bash
NEXT_DIST_DIR=.next-performance-production pnpm build
NEXT_DIST_DIR=.next-performance-production \
PRISMA_QUERY_METRICS=1 \
TRANSLATE_PERFORMANCE_FIXTURES=1 \
DICTIONARY_PERFORMANCE_FIXTURES=1 \
pnpm start

pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000 --samples=5
```

Only automate owned production server if manual flow proves reliable.

## Related Code Files

- Modify: `package.json`
- Modify: `tests/performance/README.md`
- Maybe modify: `tests/performance/benchmark-utils.ts`

## Implementation Steps

1. Verify whether `NEXT_DIST_DIR` works for both `next build` and `next start` in this Next.js version.
2. Add documentation for manual production benchmark flow.
3. Add package script only if it can be simple and reliable.
4. If automating:
   - build first
   - start `next start` on free port
   - wait for `/en/sign-in`
   - run same suites
   - cleanly stop server
5. Keep production benchmark opt-in. Do not replace default dev benchmark yet.

## Success Criteria

- [x] A developer can run benchmark against `next start`.
- [x] Production benchmark uses isolated dist dir or documented safe build output.
- [x] Existing `pnpm test:performance` still works.
- [x] README explains dev benchmark vs production benchmark.

## Risk Assessment

Medium-high risk. Production builds may require env vars, database state, and fixture routes that differ from dev. Start with documented reuse-server flow before adding automation.
