---
title: "migrate-artifact-routes-to-workflow"
description: "Replace after() in POST /api/artifact/flashcard and /api/artifact/question with Vercel Workflow for durable, retryable artifact generation"
status: completed
priority: P1
effort: "3h"
tags: [workflow, vercel, ai, artifact, flashcard, question]
created: 2026-08-20
completed: 2026-08-20T21:04:00+07:00
---

# migrate-artifact-routes-to-workflow

## Overview

Apply the same workflow pattern used in passage processing to the artifact generation routes. Replace `after()` callbacks in `POST /api/artifact/flashcard` and `POST /api/artifact/question` with durable Vercel Workflows for reliable AI artifact generation.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Create `artifactGenerationWorkflow` in `src/workflows/` | P1 |
| 2 | Update flashcard route to trigger workflow instead of `after()` | P1 |
| 3 | Update question route to trigger workflow instead of `after()` | P1 |
| 4 | Preserve all existing error handling and Sentry logging | P1 |
| 5 | Verify typecheck and tests pass | P2 |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/artifact/flashcard  (and /api/artifact/question)      │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ 1. Auth         │→ │ 2. Validate      │→                    │
│  └─────────────────┘  └─────────────────┘                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 3. Create DB    │→ │ 4. start()       │→ │ 5. Return 201    │ │
│  │    (PENDING)    │  │    workflow      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  artifactGenerationWorkflow (src/workflows/artifact-generation/)│
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ 'use workflow'  │→ │ generateArtifact │                     │
│  └─────────────────┘  └─────────────────┘                      │
│              ↓ (on error)                                       │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ failStep        │→ │ Sentry + FAILED │                     │
│  │ (catch block)   │  │                 │                     │
│  └─────────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| Action | Path |
|--------|------|
| Create | `src/workflows/artifact-generation/index.ts` |
| Create | `src/workflows/artifact-generation/steps.ts` |
| Modify | `app/api/artifact/flashcard/route.ts` |
| Modify | `app/api/artifact/question/route.ts` |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Create Artifact Generation Workflow](./phase-01-create-workflow.md) | Pending |
| 2 | [Update Flashcard Route](./phase-02-update-flashcard-route.md) | Pending |
| 3 | [Update Question Route](./phase-03-update-question-route.md) | Pending |
| 4 | [Verify + Test](./phase-04-verify.md) | Pending |

## Success Criteria

- [ ] `POST /api/artifact/flashcard` returns 201 and triggers workflow
- [ ] `POST /api/artifact/question` returns 201 and triggers workflow
- [ ] Workflow executes `generateAndStoreArtifact`
- [ ] AI failures (timeout) logged to Sentry, artifact marked as FAILED
- [ ] `generateAndStoreArtifact` unchanged (workflow only orchestrates)
- [ ] Typecheck passes
- [ ] Existing tests pass

## Non-Goals

- Adding new retry logic beyond workflow defaults
- Changing the artifact schema or API response format
- Modifying `generateAndStoreArtifact` service function
- Creating separate workflows per artifact type (single workflow handles both)

## Open Questions

None — pattern follows established passage processing workflow.

<!-- slug: migrate-artifact-routes-to-workflow -->
