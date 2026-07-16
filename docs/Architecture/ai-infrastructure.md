# AI Infrastructure Architecture

## Status

Implemented.

## Overview

AI infrastructure provides unified access to OpenAI models with observability, sandboxing, and tracing.

## Structure

```
src/infrastructure/ai/
└── index.ts     # All AI exports
```

## Client

```typescript
import { openai } from "@/infrastructure/ai";
```

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `openai` | Client | OpenAI SDK client |
| `getModel(purpose)` | Function | Get model ID by purpose |
| `MODELS` | Constant | Model registry |
| `withAITrace(ctx, fn)` | Wrapper | AI calls with logging + Sentry |
| `wrapUserText(text)` | Sanitizer | Sandbox user-provided text |

## Model Registry

```typescript
export const MODELS = {
  chat: {
    id: "gpt-4o-mini",
    maxTokens: 16384,
  },
  structured: {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
} as const;
```

**Usage:**

```typescript
import { getModel } from "@/infrastructure/ai";

const modelId = getModel("chat"); // "gpt-4o-mini"
const modelId = getModel("structured"); // "gpt-4o-mini"
```

---

## Routes & Connectors

### Route: AI Chat (Streaming)

```
Client → Server Action → OpenAI Stream → Client
```

```typescript
// features/<f>/server/services/ai-chat.ts
import { openai } from "@/infrastructure/ai";
import { streamText } from "ai";

export async function chatStream(messages: Message[]) {
  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    system: "You are a helpful assistant.",
  });

  return result.toDataStreamResponse();
}
```

### Route: Structured Output (Inngest Jobs)

```
Server Action → inngest.send() → Inngest → AI (structured) → DB
```

```typescript
// features/<f>/server/services/question-generator.ts
import { openai, withAITrace } from "@/infrastructure/ai";
import { generateObject } from "ai";

export async function generateQuestions(content: string, count: number) {
  return withAITrace(
    { operation: "generate-questions", feature: "studio-panel", model: "gpt-4o-mini" },
    () =>
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: questionsSchema,
        prompt: `Generate ${count} questions about: ${content}`,
      })
  );
}
```

### Connector: User Text Sandboxing

Always wrap user input before sending to AI:

```typescript
import { wrapUserText } from "@/infrastructure/ai";

const safePrompt = wrapUserText(userText, "user_content");
// Use safePrompt in AI calls
```

---

## Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│  Feature Services                                           │
│  (ai-chat.ts, question-generator.ts)                       │
│  → Use AI infra with wrappers                               │
├─────────────────────────────────────────────────────────────┤
│  AI Infrastructure Layer                                    │
│  (@/infrastructure/ai)                                     │
│  → Client, models, tracing, sandboxing                     │
├─────────────────────────────────────────────────────────────┤
│  External AI Providers (OpenAI)                             │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** AI infra knows nothing about features. Features know about AI infra.

---

## Feature Organization

### studio-panel

```
features/studio-panel/server/
├── services/
│   ├── ai-chat.ts              # Chat streaming (sync AI)
│   └── question-generator.ts    # Structured generation (async job)
└── inngest/
    └── generate-questions.ts   # Inngest job → calls question-generator.ts
```

### upload

```
features/upload/server/
├── services/analyzers/
│   ├── cefr-detector.ts       # AI CEFR detection
│   └── vocabulary-extractor.ts # AI vocabulary extraction
└── inngest/
    └── process-upload.ts      # Inngest job → calls analyzers
```

---

## Import Patterns

| Context | Import from |
|---------|-------------|
| Streaming chat | `@/infrastructure/ai` + `ai` SDK |
| Structured generation | `@/infrastructure/ai` + `ai` SDK |
| User text sandboxing | `@/infrastructure/ai` |

---

## Tracing Strategy

### withAITrace()

Wrap expensive operations for logging + Sentry:

```typescript
// Good — expensive structured generation
await withAITrace(
  { operation: "generate-questions", feature: "studio-panel", model: "gpt-4o-mini" },
  () => generateObject({ ... })
);

// Skip — streaming chat (too noisy)
streamText({ ... });
```

---

## Observability

| Layer | Tool | What |
|-------|------|------|
| AI Calls | Pino (`moduleLog`) | Feature-specific logs |
| AI Errors | Sentry | Error aggregation with AI tags |
| Structured Jobs | Inngest Dashboard | Step timing, retries |

---

## Related Docs

- [inngest-architecture.md](./inngest-architecture.md) — Inngest async jobs
- [observability.md](./observability.md) — Logging + tracing
