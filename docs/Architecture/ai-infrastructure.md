# AI Infrastructure Architecture

## Status

Implemented.

## Current Structure

```
src/infrastructure/
├── ai/index.ts        # Unified AI infrastructure
└── inngest.ts   # Inngest client + job registry
```

### ai — Unified AI Exports

```typescript
// All from one place
import { openai, getModel, MODELS, withAITrace, wrapUserText } from "@/infrastructure/ai";
```

**Exports:**
| Export | Purpose |
|--------|---------|
| `openai` | OpenAI SDK client |
| `getModel(purpose)` | Get model ID by purpose (`chat`, `structured`) |
| `MODELS` | Model registry constant |
| `withAITrace(ctx, fn)` | Wrap AI calls with logging + Sentry |
| `wrapUserText(text)` | Sandbox user-provided text |

### inngest — Unified Inngest Exports

```typescript
// All from one place
import { inngest, inngestFunctions } from "@/infrastructure/inngest";
```

**Exports:**
| Export | Purpose |
|--------|---------|
| `inngest` | Inngest client singleton |
| `inngestFunctions` | Registry of all feature jobs |

---

## Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│  Feature Code                                               │
│  (studio-panel, upload)                                     │
├─────────────────────────────────────────────────────────────┤
│  Orchestration Layer (Inngest)                             │
│  → Owns workflow, retries, fan-out, result delivery        │
│  → May call AI infra multiple times per job                │
│  → NOT aware of AI internals                               │
├─────────────────────────────────────────────────────────────┤
│  AI Infrastructure Layer                                    │
│  → Pure functions: make AI calls with observability        │
│  → No side effects, no job awareness                        │
├─────────────────────────────────────────────────────────────┤
│  External AI Providers (OpenAI)                            │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** AI infra knows nothing about Inngest. Inngest knows about AI infra.

---

## Feature Organization

### studio-panel

```
features/studio-panel/server/
├── services/
│   ├── ai-chat.ts              # Chat streaming (sync AI)
│   └── question-generator.ts    # Structured generation (async job)
└── inngest/
    └── generate-questions.ts   # Inngest job
```

### upload

```
features/upload/server/
├── services/analyzers/
│   ├── cefr-detector.ts       # AI CEFR detection
│   └── vocabulary-extractor.ts # AI vocabulary extraction
└── inngest/
    ├── events.ts              # Event definitions
    └── process-upload.ts      # Inngest job
```

---

## Import Patterns

| Context | Import from |
|---------|-------------|
| Services (sync AI) | `"ai"` (SDK) + `@/infrastructure/ai` |
| Jobs (async workflow) | `"inngest"` (SDK) + `@/infrastructure/inngest` |
| Actions (send events) | `@/infrastructure/inngest` |
| API routes | `"inngest/next"` + `@/infrastructure/inngest` |

---

## Tracing Strategy

### Manual (in services)

Use `withAITrace()` for expensive operations only:

```typescript
// Good — expensive structured generation
await withAITrace(
  { operation: "generate-questions", feature: "studio-panel", model: getModel("structured") },
  () => generateObject({ ... })
);

// Skip — streaming chat (too noisy)
streamText({ ... });
```

### Inngest (for jobs)

Inngest provides built-in step-level tracing in dashboard. No extra setup needed.

---

## Observability

| Layer | Tool | What it captures |
|-------|------|-----------------|
| Services | Pino (`moduleLog`) | Feature-specific logs |
| Services | Sentry | Error aggregation |
| Jobs | Inngest Dashboard | Step timing, retries, failures |
| All | Sentry | Cross-cutting errors |

---
