# Research Report: AI SDK v7 generateText options — what's actually real

## Executive Summary

The user pushed back on a previous answer that claimed `timeout` was a deprecated option in `ai@7` and that `AbortSignal.timeout()` was the replacement. Verification against the actual source and migration docs shows that claim was **wrong**. `timeout` is a real, honored top-level option in v7 — it gets split into `totalTimeoutMs` + `stepTimeoutMs` and merged with `abortSignal`. The earlier answer conflated "cancel an in-flight call" (which `AbortSignal` does) with "cap total wall time" (which `timeout` does), then confidently asserted the wrong one. The model id `deepseek/deepseek-v4-flash` does exist on the Vercel AI Gateway, so that's not a silent failure path either.

## Research Methodology

- Sources consulted: 3 (ctx7 docs for `/vercel/ai`, ctx7 source extract from `packages/ai/src/generate-text/generate-text.ts`, live AI Gateway models endpoint)
- Date of research: 2026-08-03
- Key search terms: `generateText timeout abortSignal options v5 v6 v7`, `generateText instructions system prompt option rename migration`, `generateText temperature option v7 provider options`
- Verification: cross-referenced the migration guide (claims) with the actual `generate-text.ts` source (implementation) — both agree.

## Key Findings

### 1. `timeout` in v7 — real and honored

From `packages/ai/src/generate-text/generate-text.ts`:

```ts
const totalTimeoutMs = getTotalTimeoutMs(timeout);
const stepTimeoutMs = getStepTimeoutMs(timeout);
const stepAbortController =
  stepTimeoutMs != null ? new AbortController() : undefined;
const mergedAbortSignal = mergeAbortSignals(
  abortSignal,
  totalTimeoutMs,
  stepAbortController?.signal,
);
```

`timeout` is split into a total budget and a per-step budget, then merged into one `AbortSignal` that the model call respects. So `timeout: 120_000` in the user's `passage-processing.ts` **is** enforced. The previous diagnosis ("your 120s timeout is never enforced") was incorrect.

From the settings guide, `timeout` is documented alongside `maxOutputTokens`, `temperature`, `maxRetries` as a first-class top-level option:

```ts
const result = await generateText({
  model: __MODEL__,
  maxOutputTokens: 512,
  temperature: 0.3,
  maxRetries: 5,
  timeout: 10000,
  prompt: '...',
});
```

### 2. `abortSignal` is the manual-cancel sibling, not the timeout replacement

`AbortSignal` is for cases where you have an external controller (user clicked Cancel, request lifecycle hook, forwarded from a parent fetch). `AbortSignal.timeout(ms)` is one convenient way to make one — but it does NOT replace the `timeout` option, it complements it. Both are merged.

If the user wants the documented, idiomatic v7 cap, the right answer is to keep `timeout: 120_000` and not touch anything. If they want a per-call cancellable handle, they can add `abortSignal` alongside it.

### 3. `instructions` rename — verified

From the v7 migration guide: `system` was renamed to `instructions` across `generateText`, `streamText`, `generateObject`, `streamObject`, `streamUI`, and the `onStart` lifecycle callback. `system` remains as a deprecated fallback; `instructions` takes precedence when both are provided.

The user's code uses `instructions: PROCESS_PROMPT` — that is correct for v7. My earlier "fix" of `instructions` → `system` would have **broken** their build (or at minimum forced a deprecation warning path).

### 4. Model id `deepseek/deepseek-v4-flash` — exists on the gateway

Live gateway response confirms these deepseek model IDs are currently served:

```
deepseek/deepseek-r1
deepseek/deepseek-v3
deepseek/deepseek-v3.1
deepseek/deepseek-v3.1-terminus
deepseek/deepseek-v3.2
deepseek/deepseek-v3.2-thinking
deepseek/deepseek-v4-flash
deepseek/deepseek-v4-flash-0731
deepseek/deepseek-v4-pro
```

So the model id resolves. A 504 / model-not-found path is not a likely cause of the user's timeout.

### 5. `temperature` — real option, provider-dependent forwarding

`temperature` is a documented top-level option in v7 and is forwarded through `callSettings` to the provider. Providers that ignore it will warn; the option itself is not deprecated.

## Comparative Analysis

| Option | v4 | v7 (verified) | Notes |
|---|---|---|---|
| `system` | top-level | top-level (deprecated fallback) | `instructions` takes precedence |
| `instructions` | not present | top-level | new canonical name |
| `timeout` | top-level (ms) | top-level (ms) | still honored, split internally into total + step |
| `abortSignal` | top-level | top-level | merged with `timeout` via `mergeAbortSignals` |
| `temperature` | top-level | top-level | forwarded; some providers warn-and-drop |
| `output: Output.object({ schema })` | introduced v5 | top-level | correct usage in user's code |

## Implementation Recommendations

The user's current `passage-processing.ts` is actually closer to correct than my previous answer suggested. The only thing in the previous "fix" that survives verification is the optional `maxOutputTokens` safety cap.

### Recommended minimal patch

```ts
const result = await generateText({
  model: "deepseek/deepseek-v4-flash",
  instructions: PROCESS_PROMPT,  // keep as-is — this is the v7 name
  prompt: [
    `User-supplied title: ${userTitle || "(none)"}`,
    "Passage:",
    cleanedText,
  ].join("\n"),
  output: Output.object({ schema: DeepseekProcessPassageResponseSchema }),
  timeout: 120_000,              // keep as-is — still honored
  temperature: 0.2,              // keep as-is — forwarded
  maxOutputTokens: 8000,         // NEW — safety cap for long transcripts
});
```

Do NOT change `instructions` to `system`. Do NOT replace `timeout` with `abortSignal: AbortSignal.timeout(...)`.

### Why the original code is actually timing out (real hypothesis)

Since the SDK options are correctly set, the timeout is probably coming from one of these:

1. **The Vercel Workflow / route handler ceiling, not the SDK timeout.** If `runPassageProcessing` runs inside `after()` or inside a Vercel Workflow step with a 60s default, the SDK's 120s `timeout` never fires — the outer runtime aborts first. Check `vercel.json` / workflow definition for the actual step budget.
2. **Output-side token pressure on long inputs.** A 5–10k word YouTube transcript produces a long cleaned `text` field plus CEFR/title — total output tokens can exceed the default 4096 cap, causing truncation or a hang. `maxOutputTokens: 8000` (or higher) is the real fix here.
3. **DeepSeek gateway latency for the `pro`/`flash` routing.** `deepseek-v4-flash` is the right pick (cheap and fast), but the gateway may queue during peak. Add `maxRetries: 0` or increase logging first.

### Verification steps

1. Wrap the `generateText` call in a manual timing log: `console.time("process")` ... `console.timeEnd("process")`. See whether the SDK returns at ~timeout or much sooner.
2. Inspect a real failed run's server log for the actual error message — if it says "Workflow execution exceeded maximum duration", the bug is the outer step ceiling, not the SDK call.
3. Try a known-good 500-char input and log `result.usage` (input/output tokens) — if output is near 4096, raise `maxOutputTokens`.

## Resources & References

### Official Documentation
- AI SDK settings (timeout, abortSignal, maxRetries): https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/25-settings.mdx
- v7 migration guide (system → instructions): https://github.com/vercel/ai/blob/main/content/docs/08-migration-guides/23-migration-guide-7-0.mdx
- `generateText` source (timeout merging): https://github.com/vercel/ai/blob/main/packages/ai/src/generate-text/generate-text.ts

### Provider / Gateway
- Vercel AI Gateway models endpoint (verified live): https://ai-gateway.vercel.sh/v1/models

## Appendices

### A. Glossary
- **`timeout`** — top-level option on `generateText`/`streamText`; caps the total wall time of the call in milliseconds. Internally split into total + per-step budgets.
- **`abortSignal`** — top-level option that lets the caller pass a `AbortController.signal` for manual cancellation. Merged with the `timeout` budget.
- **`instructions`** — v7 rename of `system`. Top-level option carrying the system prompt / role instructions.
- **`maxOutputTokens`** — top-level option that caps the model's output token count. Default is provider-dependent (often 4096).

### B. Version Compatibility Matrix
- `ai@7.0.37` (installed in this repo) supports all four options above as top-level. `system` is a deprecated alias for `instructions`. `timeout` and `abortSignal` coexist.

### C. Raw Research Notes
- ctx7 query 1: `generateText timeout abortSignal options v5 v6 v7` — confirmed `timeout` is in current settings docs and in `generate-text.ts` source; `AbortSignal.timeout` is shown as the convenience pattern but not as a replacement.
- ctx7 query 2: `generateText instructions system prompt option rename migration` — confirmed `system → instructions` rename in v7 migration guide; `system` kept as deprecated fallback.
- ctx7 query 3: `generateText temperature option v7 provider options` — confirmed `temperature` is documented top-level alongside `timeout`, `maxOutputTokens`, `maxRetries`.
- Live gateway fetch: `deepseek/deepseek-v4-flash` is listed, so model resolution is not a suspect.

## Unresolved Questions

- What is the actual outer step budget for `runPassageProcessing`? Is it running inside a Vercel Workflow step with a 60s/120s ceiling, or inside `after()` of a route handler? The SDK options look fine, so the timeout likely lives one layer up. Worth confirming before any further code change.
