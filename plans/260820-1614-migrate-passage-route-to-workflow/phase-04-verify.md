---
phase: 4
title: "Verify + Test"
status: pending
priority: P2
effort: "1h"
dependencies: [3]
---

# Phase 4: Verify + Test

## Overview

Run verification checks to ensure the migration works correctly and doesn't break existing functionality.

## Requirements

- Functional: Typecheck passes
- Functional: Lint passes
- Functional: Dev server starts without errors
- Functional: Workflow can be triggered (manual test)

## Implementation Steps

1. **Run typecheck**
   ```bash
   pnpm typecheck
   ```

2. **Run lint**
   ```bash
   pnpm lint
   ```

3. **Run knip** (unused code detection)
   ```bash
   pnpm knip
   ```

4. **Start dev server and verify**
   ```bash
   pnpm dev
   # Visit /api/passage GET to verify auth still works
   ```

5. **Local workflow test**
   ```bash
   # In a separate terminal, trigger a passage create
   curl -X POST http://localhost:3000/api/passage \
     -H "Content-Type: application/json" \
     -d '{"text": "...", "sourceUrl": "..."}'

   # Inspect workflow runs
   npx workflow inspect runs
   # Or with web UI:
   npx workflow inspect runs --web
   ```
   - Verify passage status changes from PENDING to COMPLETED/FAILED
   - Check workflow runs locally (synchronous execution via Local World)

6. **Preview deployment test** (after deploying to Vercel)
   - Verify workflow runs in Vercel dashboard
   - Check retry behavior and observability features
   - Verify long sleep() timing (if any)

## Success Criteria

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm knip` passes
- [ ] Dev server starts
- [ ] `GET /api/passage` returns authenticated response
- [ ] No TypeScript errors in new workflow file
- [ ] Workflow runs locally via Local World (synchronous execution)
- [ ] `npx workflow inspect runs` shows workflow executions

## Risk Assessment

- **Risk**: Workflow behavior differs between local and production (concurrency, retry timing, versioning)
  - **Mitigation**: Local World runs synchronously — good for logic verification. Use `pnpm dev` + `npx workflow inspect runs` to inspect runs locally.
- **Risk**: Hooks/webhooks from external services cannot reach localhost
  - **Mitigation**: This workflow uses no external hooks. Only `sleep()` calls would need longer timeouts verified on Vercel preview deployment.
- **Risk**: Observability (dashboard, metrics) not available locally
  - **Mitigation**: Full observability verification only on Vercel preview deployment
