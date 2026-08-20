---
title: "migrate-passage-route-to-workflow"
description: "Replace after() in POST /api/passage with Vercel Workflow for durable, retryable passage processing"
status: pending
priority: P1
effort: "4h"
tags: [workflow, vercel, ai, passage]
created: 2026-08-20
---

# migrate-passage-route-to-workflow

## Overview

Replace the `after()` callback in `POST /api/passage` route with a Vercel Workflow to handle passage processing durably. This moves preprocessing + AI metadata/content generation into a durable workflow that survives cold starts, retries on transient failures, and provides observability via Vercel dashboard.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Install and configure Vercel Workflow SDK | P1 |
| 2 | Create `passageProcessingWorkflow` in `src/workflows/` | P1 |
| 3 | Update route to trigger workflow instead of `after()` | P1 |
| 4 | Preserve all existing error handling and Sentry logging | P1 |
| 5 | Update tests to verify workflow behavior | P2 |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/passage                                              │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ 1. Auth         │→ │ 2. Validate      │→                    │
│  └─────────────────┘  └─────────────────┘                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 3. Create DB    │→ │ 4. start()      │→ │ 5. Return 202   │ │
│  │    (PENDING)    │  │    workflow      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  passageProcessingWorkflow (src/workflows/passage-processing.ts)│
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ 'use workflow'  │  │ preprocessPassage │ (from service)     │
│  └─────────────────┘  └─────────────────┘                      │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ runPassageProc.. │  │ Error Handling  │                     │
│  │ (from service)  │  │ Sentry + FAILED │                     │
│  └─────────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| Action | Path |
|--------|------|
| Create | `src/workflows/passage-processing.ts` |
| Modify | `app/api/passage/route.ts` |
| Modify | `next.config.ts` (add withWorkflow) |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Setup: Install Workflow SDK + Configure Next.js](./phase-01-setup.md) | Pending |
| 2 | [Create Workflow Definition](./phase-02-create-workflow.md) | Pending |
| 3 | [Update Route to Use Workflow](./phase-03-update-route.md) | Pending |
| 4 | [Verify + Test](./phase-04-verify.md) | Pending |

## Success Criteria

- [ ] `POST /api/passage` returns 202 and triggers workflow
- [ ] Workflow executes `preprocessPassage` then `runPassageProcessing`
- [ ] Partial AI failures (timeout) logged to Sentry, passage still completed
- [ ] Fatal failures set passage status to `FAILED`
- [ ] All existing services (`passage-crud.ts`, `passage-processing.ts`, `passage-preprocessing.ts`) unchanged
- [ ] Typecheck passes
- [ ] Existing tests pass

## Non-Goals

- Adding new retry logic beyond workflow defaults
- Changing the passage schema or API response format
- Moving preprocessing out of the workflow

## Open Questions

None — architecture discussed and agreed in session.

<!-- slug: migrate-passage-route-to-workflow -->
