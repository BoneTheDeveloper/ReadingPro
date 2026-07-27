# Plan: Switch AI calls to Vercel AI Gateway (simplified)

## Context

Today every AI call in the app is routed through the `@ai-sdk/openai` provider
adapter using a per-call `OPENAI_API_KEY`. That works but couples the app to a
single provider with a single key, and adds a thin `wrapUserText` /
`withAITrace` wrapper layer around each call.

The Vercel AI SDK ships a built-in `gateway` provider that lets a `model` be a
plain `provider/model` string. With one `AI_GATEWAY_API_KEY`, the same call
sites work today and stay portable to any provider the gateway exposes
tomorrow — no extra SDK package, no per-provider key.

The user wants the call shape simplified to the SDK's native form, with the
model string written inline at each call site:

```ts
const { text } = await generateText({
  model: "openai/gpt-4o-mini",
  prompt: "...",
});
```

No `wrapUserText`, no `withAITrace`, no `openai(...)` adapter, no `getModel`
indirection.

## Decisions already made

- Auth: `AI_GATEWAY_API_KEY` (single env var).
- Providers: OpenAI only for now (`openai/*` model strings).
- Old key: remove `OPENAI_API_KEY` from `.env.example` cleanly.
- Helpers `wrapUserText` and `withAITrace`: dropped from every call site, and
  their files deleted.
- `getModel` / `models.ts` indirection: removed; model string is inline at
  each call site.

## Model IDs (verified against live gateway catalog, 2026-07-27)

Pulled from `https://ai-gateway.vercel.sh/v1/models`. Same family as today's
hardcoded `gpt-4o-mini`, kept as the cheapest reliable default for all five
purposes. All five call sites use the same string:

```
openai/gpt-4o-mini
```

## Files to modify

### `src/lib/ai/models.ts` — delete

No more indirection. Each call site writes the string inline.

### `src/lib/ai/client.ts` — delete

No longer needed. The gateway provider is imported from `ai`.

### `src/lib/ai/prompt.ts` — delete

`wrapUserText` is dropped at every call site per the user's instruction.

### `src/lib/ai/trace.ts` — delete

`withAITrace` is dropped at every call site per the user's instruction.

### `src/lib/ai/index.ts` — delete

Nothing left to re-export. The directory itself goes.

### Call sites — inline model string, drop wrappers

All five files follow the same pattern:

1. Drop all `@/lib/ai` imports.
2. Drop `wrapUserText` and `withAITrace` wrappers.
3. Write `model: "openai/gpt-4o-mini"` directly in the SDK call.

Representative diffs:

- **`src/features/reading/server/services/translate.ts`** — `model: openai(model)` → `model: "openai/gpt-4o-mini"`. Drop the `wrapUserText(input.text, "headword")` / `wrapUserText(input.context, "context_sentence")` wrappers; pass raw values. Drop the `withAITrace` wrapper; call `generateObject` directly. Keep all error mapping (`APICallError`, `NoObjectGeneratedError`, timeout) unchanged.
- **`src/features/upload/server/services/analyzers/vocabulary-extractor.ts`** — drop `withAITrace`, use `model: "openai/gpt-4o-mini"` inline.
- **`src/features/upload/server/services/analyzers/cefr-detector.ts`** — same pattern.
- **`src/features/studio/server/services/question/question-generator.ts`** — same pattern; also drop `wrapUserText(numberedPassage)` and pass the raw passage.
- **`src/features/studio/server/services/ai-chat/ai-chat.ts`** — `model: openai(modelId)` → `model: "openai/gpt-4o-mini"`. Drop `wrapUserText(...)` around the passage context block; pass the raw title/content string into the system message. Keep `streamText`, `temperature`, and `onFinish` persistence unchanged. The `modelId` log field can stay as the same string literal or be removed.

### `package.json` — drop `@ai-sdk/openai`

Remove the `"@ai-sdk/openai"` entry. `ai` and `@ai-sdk/react` stay. Run
`pnpm install` to update the lockfile.

### `.env.example` — swap key

Remove the `OPENAI_API_KEY` block. Add:

```
# Vercel AI Gateway API key (required for AI features)
# Get yours at: https://vercel.com/dashboard → AI Gateway → API Keys
AI_GATEWAY_API_KEY=your_api_key_here
```

## Verification

1. `pnpm typecheck` — must pass; confirms no dead `openai`/`wrapUserText`/
   `withAITrace`/`getModel` imports remain.
2. `pnpm lint` — must pass.
3. `pnpm knip` — must pass; will flag dead files (the whole `src/lib/ai/`
   directory) and dead deps (`@ai-sdk/openai`) if anything is left behind.
4. Manual smoke (one call path per service):
   - Inline translate: click a word in the reading panel, confirm popup
     resolves a Vietnamese gloss.
   - Studio chat: open a passage, send a turn, confirm streamed tokens arrive.
   - Question generator: trigger generate, confirm structured questions come
     back.
   - Vocabulary / CEFR: run the upload analyzers on a fixture text.
5. With `AI_GATEWAY_API_KEY` unset, confirm the routes return their existing
   error mapping (translate: 502 `upstream`; chat: surfaced as the SDK
   `APICallError`).

## Out of scope

- Switching any purpose off `gpt-4o-mini` (user chose "OpenAI only, minimal
  swap").
- Reintroducing `wrapUserText` / `withAITrace` / `getModel` (user asked to drop
  them).
- Touching unrelated env vars, schemas, or transport behavior.
- Adding `gateway` to AI SDK DevTools (not requested).