# AI Infrastructure Architecture

## Status

Proposed.

## Context

AI capabilities are scattered across the codebase with no shared infrastructure:

- **`src/infrastructure/ai/`** — only `prompt-utils.ts` + `model-config.ts` (hardcoded model ID, no actual client)
- **`src/infrastructure/inngest.ts`** — generic Inngest, no AI-specific job patterns
- **`features/studio-panel/server/services/`** — imports `openai` + `streamText`/`generateObject` directly per file
- **`features/upload/server/services/analyzers/`** — CEFR/vocab are hardcoded stubs

Problems:
1. No unified AI client factory — each service instantiates independently
2. Hardcoded `"gpt-4o-mini"` in 3+ places
3. No observability for AI calls (latency, tokens, errors)
4. No shared Inngest AI-job patterns (upload has its own `inngest/` subdir)
5. Upload AI analyzers are not implemented

## Design Principles

### Layer Separation (Critical)

```
┌─────────────────────────────────────────────────────────────┐
│  Feature Code                                               │
│  (studio-panel, upload)                                     │
├─────────────────────────────────────────────────────────────┤
│  Orchestration Layer (Inngest)                             │
│  → Owns workflow, retries, fan-out, result delivery        │
│  → May call AI infra multiple times per job                │
│  → NOT aware of AI internals (provider, models, etc.)       │
├─────────────────────────────────────────────────────────────┤
│  AI Infrastructure Layer                                    │
│  → Pure functions: make AI calls with observability        │
│  → No side effects, no job awareness                        │
│  → Reusable from server actions, cron, Inngest, tests      │
├─────────────────────────────────────────────────────────────┤
│  External AI Providers                                      │
│  (OpenAI, Anthropic, OpenRouter)                           │
└─────────────────────────────────────────────────────────────┘
```

**Rule: AI infra knows nothing about Inngest. Inngest knows about AI infra.**

### Sync vs Async Decision Matrix

| Feature | Pattern | Rationale |
|---------|---------|-----------|
| **Chat** | **Sync (streaming)** | Real-time streaming, user expects instant response |
| **Question generation** | **Async (Inngest)** | Expensive (multiple AI calls), results saved to DB, user can poll |
| **Upload processing** | **Async (Inngest)** | Already async, long-running, I/O + AI mixed |
| **CEFR detection** | **Part of upload job** | Tightly coupled to upload pipeline |
| **Vocabulary extraction** | **Part of upload job** | Tightly coupled to upload pipeline |

**Rationale for question generation:**
- Currently sync → blocks user until complete
- AI calls can be slow (5-30s) → timeout risk
- Inngest gives: retries, deduplication, progress tracking, free polling
- Results saved to DB anyway → client just polls for completion

### Result Delivery

**Simple polling** (MVP, local-friendly):

```
User clicks "Generate Quiz"
  → Server Action sends Inngest event
  → Client polls GET /api/jobs/[jobId] every 2s
  → When status=DONE, redirect to quiz results
```

- Inngest stores job output in `step.output()`
- No extra infrastructure needed
- Works locally without special setup
- **Upgrade path:** SSE via `step.sendEvent()` if UX demands real-time

## Goals

1. **Unified client** — single factory, easy to navigate
2. **Model abstraction** — OpenAI now, pluggable for OpenRouter/anthropic later
3. **Simple observability** — structured logs (latency, model, tokens), no extra dashboards
4. **Shared Inngest patterns** — consistent AI job structure

## Ownership Model

### Hybrid Approach — Feature Owns AI Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│  infrastructure/ai/          │  features/<f>/server/                 │
│  (Shared, Reusable)         │  (Feature-Owned)                      │
├─────────────────────────────┼─────────────────────────────────────┤
│  client.ts                  │  services/<domain>-ai.ts            │
│  - AI SDK factory           │  - Feature prompts (strings)         │
│  - Provider config          │  - Feature schemas (Zod)             │
│                             │  - Feature validation                │
│  models.ts                  │  - Feature business logic           │
│  - Model registry           │                                      │
│  - getModel() helper        │  jobs/<job>.ts                      │
│                             │  - Job definition                    │
│  observability.ts            │  - Orchestrates AI calls            │
│  - withAITrace()            │  - Uses shared steps                │
│  - Sentry integration       │                                      │
└─────────────────────────────┴─────────────────────────────────────┘
```

### Rule: Feature owns prompts & schemas. AI infra provides utilities.

| What | Where | Why |
|------|-------|-----|
| Prompts (system, user templates) | Feature | Feature-specific, may differ per use case |
| Output schemas (Zod) | Feature | Feature owns its data shape |
| AI client (Vercel AI SDK) | AI infra | Shared, configured once |
| Model config (IDs, caps) | AI infra | Single source of truth |
| Observability (tracing) | AI infra | Shared, consistent |
| Job orchestration | Feature | Feature owns its workflow |

### Per-Feature Observability

Each AI call is tagged with its feature:

```typescript
// studio-panel call
await withAITrace({ operation: "chat", feature: "studio-panel", model: "chat" }, fn);

// upload call
await withAITrace({ operation: "cefr", feature: "upload", model: "structured" }, fn);
```

**Benefit:** Filter traces by feature in Sentry → see cost/latency per feature.

---

## Proposed Structure

```
src/
├── infrastructure/
│   ├── ai/                          # Shared AI utilities
│   │   ├── client.ts               # AI SDK factory (createAI wrapper)
│   │   ├── models.ts               # Model registry (IDs, capabilities)
│   │   ├── observability.ts        # withAITrace() + Sentry span helpers
│   │   └── index.ts                # Public exports
│   │
│   ├── inngest/                    # Job orchestration primitives
│   │   ├── client.ts               # Inngest singleton
│   │   ├── jobs/                   # Shared job helpers
│   │   │   └── types.ts           # Shared job input/output types
│   │   └── steps/                  # Shared Inngest step primitives
│   │       ├── ai.ts              # runAIStep() for AI calls
│   │       └── storage.ts         # Blob download/upload steps
│   │
│   └── storage.ts                  # unchanged
```

```
features/
├── studio-panel/
│   └── server/
│       ├── services/
│       │   ├── chat-ai.ts          # Chat prompts, logic (OWNS prompts)
│       │   ├── question-ai.ts      # Question gen prompts, logic
│       │   └── ...
│       ├── jobs/
│       │   └── generate-questions.ts  # Inngest job (uses infrastructure/inngest)
│       └── ...
│
├── upload/
│   └── server/
│       ├── services/
│       │   ├── analyzers/
│       │   │   ├── cefr-detector.ts      # Feature owns prompts
│       │   │   ├── vocabulary-extractor.ts
│       │   │   └── topic-tagger.ts
│       │   └── ...
│       ├── jobs/
│       │   └── process-upload.ts    # Inngest job
│       └── ...
```

### File Location Decisions

| Decision | Answer |
|----------|--------|
| **Inngest client location** | `infrastructure/inngest/client.ts` + re-export from `infrastructure/inngest.ts` |
| **Feature prompts** | In `features/<f>/server/services/<domain>-ai.ts` — feature owns its prompts |
| **Shared prompts** | Only move to `infrastructure/ai/prompts.ts` if 2+ features reuse them |

## Key Design Decisions

### 1. AI Client Factory (`infrastructure/ai/client.ts`)

```typescript
import { createAI } from "ai";
import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider"; // future

const providers = {
  openai: openai,
  openrouter: openrouter,
};

export const ai = createAI({
  provider: providers[process.env.AI_PROVIDER ?? "openai"],
});

// Usage in services:
import { ai } from "@/infrastructure/ai";
ai.streamText({ model: "gpt-4o-mini", ... });
ai.generateObject({ model: "gpt-4o-mini", ... });
```

- Provider configured once at factory
- OpenRouter: set `AI_PROVIDER=openrouter` + `OPENROUTER_API_KEY`
- Individual calls specify model (via `models.ts`)

### 2. Model Registry (`infrastructure/ai/models.ts`)

```typescript
export const MODELS = {
  chat: {
    id: "gpt-4o-mini",
    provider: "openai",
    maxTokens: 16384,
  },
  structured: {
    id: "gpt-4o-mini",
    provider: "openai",
    maxTokens: 8192,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

export function getModel(purpose: ModelPurpose) {
  const model = MODELS[purpose];
  return { provider: model.provider, modelId: model.id };
}
```

### 3. Observability (`infrastructure/ai/observability.ts`)

```typescript
export interface AITraceContext {
  operation: string;
  feature: string;
  model: string;
}

export async function withAITrace<T>(
  ctx: AITraceContext,
  fn: () => Promise<T>
): Promise<T>
```

- Logs: `{ operation, model, feature, latencyMs, error? }`
- Creates Sentry span with AI metadata
- Pure function — no Inngest awareness

### 4. Inngest AI Step (`infrastructure/inngest/steps/ai.ts`)

```typescript
import { withAITrace, type AITraceContext } from "@/infrastructure/ai/observability";

export async function runAIStep<T>(
  stepName: string,
  ctx: AITraceContext,
  step: { run: () => Promise<T> }
): Promise<T>
```

- Combines: Inngest `step.run()` + AI observability
- `step.run()` makes the call retry-safe (Inngest re-runs the whole step)
- **Important:** For expensive AI calls, consider Inngest deduplication to avoid re-running costly calls

### 5. Feature AI Services

```typescript
// features/studio-panel/server/services/studio-ai.ts
import { ai } from "@/infrastructure/ai";
import { getModel } from "@/infrastructure/ai/models";

export async function streamStudyChat(...) {
  return ai.streamText({
    model: getModel("chat").modelId,
    system: SYSTEM_PROMPT,
    messages: [...],
  });
}

export async function generateComprehensionQuestions(...) {
  return ai.generateObject({
    model: getModel("structured").modelId,
    schema: questionGenerationDataSchema,
    ...
  });
}
```

### 6. Question Generation Job (New Inngest Job)

```typescript
// features/studio-panel/server/jobs/generate-questions.ts
import { inngest } from "@/infrastructure/inngest";
import { runAIStep } from "@/infrastructure/inngest/steps/ai";

export const generateQuestionsJob = inngest.createFunction(
  { id: "generate-questions", name: "Generate Questions" },
  { event: "studio/questions.generate" },
  async ({ event, step }) => {
    const { passageId, questionCount } = event.data;

    const questions = await runAIStep("generate-questions", {
      operation: "generate-questions",
      feature: "studio-panel",
      model: "structured",
    }, async () => {
      return generateComprehensionQuestions(passageText, questionCount);
    });

    await step.run("save-questions", async () => {
      return saveQuestionsToDB(passageId, questions);
    });

    return { passageId, questionCount: questions.length };
  }
);
```

- Triggered by server action when user requests quiz
- Client polls job status via API route

## Migration Path

**Phase 1 — Scaffold AI infrastructure (low risk)**
1. Create `infrastructure/ai/client.ts` wrapping Vercel AI SDK
2. Create `infrastructure/ai/models.ts` with `MODELS` constant
3. Create `infrastructure/ai/observability.ts` with `withAITrace()`
4. Update `infrastructure/ai/prompt-utils.ts` → `prompts.ts`

**Phase 2 — Migrate studio-panel (sync features)**
1. Update `server/services/ai-chat.ts` to use `ai` client + `getModel()`
2. Update `server/services/question-generator.ts` to use `ai` client + `getModel()`
3. Add `withAITrace()` around AI calls
4. Delete unused direct `@ai-sdk/openai` imports

**Phase 3 — Migrate Inngest infrastructure**
1. Create `infrastructure/inngest/client.ts` (new Inngest singleton)
2. Create `infrastructure/inngest/steps/ai.ts` with `runAIStep()`
3. Create `infrastructure/inngest/steps/storage.ts` with shared blob steps
4. Create `infrastructure/inngest/jobs/types.ts` for shared job types
5. Migrate `features/upload/server/inngest/` to use shared steps

**Phase 4 — Implement upload analyzers**
1. Implement `analyzers/cefr-detector.ts` using `ai.generateObject()`
2. Implement `analyzers/vocabulary-extractor.ts` using `ai.generateObject()`
3. Update upload pipeline to use real analyzers with `runAIStep()`

**Phase 5 — Add question generation job**
1. Create `features/studio-panel/server/jobs/generate-questions.ts`
2. Create API route for job status polling
3. Update question generation UI to use async flow

## Decisions Made

| Decision | Resolution |
|----------|------------|
| **AI client** | `infrastructure/ai/client.ts` wrapping Vercel AI SDK |
| **Model config** | `infrastructure/ai/models.ts` — single source of truth |
| **Observability** | `withAITrace()` with per-feature tagging |
| **Feature prompts** | Feature owns — in `features/<f>/server/services/` |
| **Job status polling** | REST endpoint (`/api/jobs/[id]`) |
| **Inngest deduplication** | Enable `deduplicate: true` on all AI jobs + app-level idempotency |
| **Question generation** | Move to async via Inngest job |
| **Boundary** | AI infra is pure utility, Inngest orchestrates, Features own prompts/schemas |

## Inngest Deduplication Mechanism

### Level 1: Inngest Built-in Deduplication

```typescript
inngest.createFunction(
  {
    id: "process-upload",
    deduplicate: true,  // Prevents duplicate job triggers
    deduplicationKey: (event) => event.data.passageId,  // Optional: custom key
  },
  { event: "upload.process" },
  async ({ event }) => { ... }
);
```

**How it works:** Inngest hashes `(functionId + deduplicationKey)`. Same key within the deduplication window → second trigger is ignored.

### Level 2: Application-Level Idempotency

```typescript
// Inside the job step — check before calling AI
const result = await step.run("analyze", async () => {
  // 1. Check if work already done
  const existing = await prisma.passageAnalysis.findUnique({
    where: { passageId: event.data.passageId }
  });
  if (existing) {
    log.info({ passageId: event.data.passageId }, "Analysis already complete, skipping AI call");
    return existing;
  }

  // 2. Only call AI if not already done
  return callAI(event.data.text);
});
```

### Why Both Levels?

| Level | Protects Against | Example |
|-------|-------------------|---------|
| Inngest deduplicate | Duplicate event sends | User clicks "Process" twice rapidly |
| App idempotency | Re-runs after failure | Job partially runs, fails on step 2, retry |

### When to Use

| Operation | Deduplication | Idempotency |
|-----------|---------------|-------------|
| Upload processing | ✅ Yes | ✅ Yes (check passageAnalysis) |
| Question generation | ✅ Yes | ✅ Yes (check existing questions) |
| Chat (sync) | N/A | N/A (user-facing, real-time) |

## References

- [Observability Architecture](../Architecture/observability.md) — Pino logging, Sentry integration
- Vercel AI SDK docs for `streamText`, `generateObject`, `generateText`
- Inngest docs for `step.run()` + retry strategies
