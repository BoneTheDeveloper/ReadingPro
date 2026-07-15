---
title: "AI Infrastructure Architecture"
description: "Unify AI infrastructure with shared client, model registry, observability, and Inngest patterns"
status: completed
priority: P2
branch: "preview"
tags:
  - ai
  - infrastructure
  - inngest
  - vercel-ai-sdk
blockedBy: []
blocks: []
created: "2026-07-15T14:33:31.360Z"
createdBy: "ck:plan"
source: skill
completed: "2026-07-15"
---

# AI Infrastructure Architecture

## Overview

Unify scattered AI code across `studio-panel` and `upload` features into a coherent infrastructure with shared client, model registry, observability, and Inngest patterns.

## Design Decisions

| Decision | Resolution |
|----------|------------|
| **AI client** | `infrastructure/ai/client.ts` wrapping Vercel AI SDK |
| **Model config** | `infrastructure/ai/models.ts` — single source of truth |
| **Observability** | `withAITrace()` with per-feature tagging |
| **Feature prompts** | Feature owns — in `features/<f>/server/services/` |
| **Job status polling** | Custom REST endpoint (`/api/jobs/[id]`) — polling only, no SSE |
| **Inngest deduplication** | Both levels: Inngest `deduplicate: true` + app-level idempotency check |
| **Question generation** | Async via Inngest job |
| **Service file names** | Keep existing names (`ai-chat.ts`, `question-generator.ts`) — no rename |
| **Boundary** | AI infra = pure utility, Inngest = orchestrator, Features = prompts/schemas |

## Layer Separation

### AI Infrastructure

```
┌─────────────────────────────────────────────────────────────────────┐
│  infrastructure/ai/              │  features/<f>/server/               │
│  (Shared, Reusable)            │  (Feature-Owned)                   │
├─────────────────────────────────┼───────────────────────────────────┤
│  client.ts                      │  services/<domain>-ai.ts           │
│  - AI SDK factory              │  - Feature prompts                 │
│  models.ts                      │  - Feature schemas (Zod)           │
│  - Model registry              │  - Feature business logic          │
│  observability.ts               │                                    │
│  - withAITrace()               │  jobs/<job>.ts                     │
│  - Sentry integration          │  - Job definition                  │
└─────────────────────────────────┴───────────────────────────────────┘
```

### Inngest Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  infrastructure/inngest/      │  features/<f>/server/jobs/           │
│  (Job Framework)             │  (Feature-Owned)                    │
├──────────────────────────────┼──────────────────────────────────────┤
│  client.ts                    │  <job>.ts                           │
│  - Inngest singleton         │  - inngest.createFunction()          │
│  registry.ts                  │  - Feature step.run() wrapping       │
│  - Maps all feature jobs      │  - Orchestrates workflow             │
│  steps/ai.ts                 │                                    │
│  - runAIStep()               │  # Service layer (no step.run)      │
│  - Shared step factories      │  services/<domain>.ts               │
└──────────────────────────────┴──────────────────────────────────────┘
```

### Job & Step Pattern

**Feature owns job definition** — job lives in `features/<f>/jobs/`

**Shared steps** (cross-cutting, in `infrastructure/inngest/steps/`):
- AI calls, email, notifications
- Step factories accepting Inngest `step` object

**Feature steps** (business logic, in job file):
- Wrapped with `step.run()` directly in job
- Delegates to service layer

```typescript
// features/upload/server/jobs/process-upload.ts
export const processUploadJob = inngest.createFunction(
  { id: "process-upload" },
  { event: "upload.process" },
  async ({ event, step }) => {
    // Feature step: I/O wrapped with step.run()
    const text = await step.run("resolve-text", async () => resolveText(...));

    // Shared step: AI call using infrastructure step factory
    const analysis = await runAIStep(
      step,
      { operation: "analyze", feature: "upload" },
      () => analyzeContent(text)
    );
  }
);
```

### Storage Architecture

```
infrastructure/storage/        # Swappable storage layer (separate from Inngest)
├── client.ts                 # Provider factory
└── providers/
    ├── vercel-blob.ts       # Vercel Blob implementation
    └── local.ts             # Local filesystem implementation
```

## Phases

| Phase | Name | Status | Dependencies |
|-------|------|--------|-------------|
| 1 | [Scaffold AI Infrastructure](./phase-01-scaffold-ai-infrastructure.md) | Completed | — |
| 2 | [Migrate Studio-Panel](./phase-02-migrate-studio-panel.md) | Completed | Phase 1 |
| 3 | [Migrate Inngest Infrastructure](./phase-03-migrate-inngest-infrastructure.md) | Completed | Phase 1 |
| 4 | [Implement Upload Analyzers](./phase-04-implement-upload-analyzers.md) | Completed | Phase 3 |
| 5 | [Add Question Generation Job](./phase-05-add-question-generation-job.md) | Completed | Phase 2, Phase 3 |

## Dependencies

No cross-plan dependencies. All phases are self-contained within this plan.

## Validation Log

### Session 1 — 2026-07-15
**Trigger:** `/ck:plan validate`
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Should we use Inngest's `sdk.run()` client or a custom REST endpoint for job status polling?
   - Options: Custom REST endpoint | Inngest SDK client
   - **Answer:** Custom REST endpoint
   - **Rationale:** Full control, works with any client, easier to extend

2. **[Architecture]** For Phase 2 file renames (ai-chat.ts → chat-ai.ts), how should we handle the API route imports?
   - Options: Rename + update imports | Keep current names
   - **Answer:** Keep current names
   - **Rationale:** `ai-chat` is descriptive as-is, no need to rename

3. **[Tradeoffs]** Should job deduplication use Inngest's built-in only, or also add application-level idempotency?
   - Options: Both levels | Inngest only
   - **Answer:** Both levels (Recommended)
   - **Rationale:** Most robust protection against duplicate AI calls

4. **[Scope]** Should `/api/jobs/[id]` also support SSE for real-time updates, or keep it simple?
   - Options: Keep simple polling | Add SSE support
   - **Answer:** Keep simple polling
   - **Rationale:** Simpler to implement, works everywhere

#### Confirmed Decisions
- Job status: Custom REST endpoint (polling only, no SSE)
- File names: Keep `ai-chat.ts`, `question-generator.ts` unchanged
- Idempotency: Both Inngest deduplication + app-level check
- Real-time: Simple polling, no SSE for MVP

#### Action Items
- [ ] Update Phase 2 to remove file rename instructions
- [ ] Add idempotency check documentation to Phase 4 and 5

### Verification Results
- Claims checked: 5
- Verified: 5 | Failed: 0 | Unverified: 0
- Tier: Standard

### Whole-Plan Consistency Sweep
- Plan overview: ✅ Consistent with decisions
- Phase 2: ✅ Updated to keep file names unchanged
- Phase 4-5: ✅ Idempotency already documented
- Phase 5: ✅ REST endpoint (not Inngest SDK)
