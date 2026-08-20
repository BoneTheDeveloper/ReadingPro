---
phase: 4
title: "Verify + Test"
status: pending
priority: P2
effort: "0.5h"
dependencies: [2, 3]
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
   # Test POST /api/artifact/flashcard
   # Test POST /api/artifact/question
   ```

5. **Local workflow test**
   ```bash
   # In a separate terminal, trigger an artifact create
   curl -X POST http://localhost:3000/api/artifact/flashcard \
     -H "Content-Type: application/json" \
     -d '{"passageId": "..."}'

   # Inspect workflow runs
   npx workflow inspect runs
   ```

6. **Verify artifact status transitions**
   - Artifact should start as PENDING
   - After workflow completes, should be COMPLETED or FAILED

## Success Criteria

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm knip` passes
- [ ] Dev server starts
- [ ] Flashcard route returns 201 and triggers workflow
- [ ] Question route returns 201 and triggers workflow
- [ ] Workflow executes `generateAndStoreArtifact`
- [ ] Error handling with Sentry logging preserved

## Risk Assessment

- **Risk**: Workflow behavior differs between local and production
  - **Mitigation**: Local World runs synchronously for logic verification
- **Risk**: Observability (dashboard, metrics) not available locally
  - **Mitigation**: Full observability verification only on Vercel preview deployment
