---
title: "Phase 3: Route + LLM Provider"
status: completed
priority: P1
effort: "1d"
dependencies: [phase-01, phase-02]
started: 2026-07-27
completed: 2026-07-27
---

# Phase 3: Route + LLM Provider

## Overview

Rebuild `POST /api/translate` so one request returns `{ translation, ipa, partOfSpeech }` from a single
server-side OpenAI Chat Completions call with `response_format: json_schema`. Introduce a small
`TranslationProvider` interface so a future swap to Gemini/Claude is local. The route owns auth, abort
passthrough, error mapping, and structured logging.

## Requirements

- [ ] `POST /api/translate` returns 200 with `{ translation, ipa, partOfSpeech, provider: "openai" }`.
- [ ] The route validates the same input shape (`text`, `context`, `sourceId`, `sourceLanguage`,
  `targetLanguage`).
- [ ] The route delegates to a `translateBundle(input, { signal })` server function.
- [ ] `TranslationProvider` interface declares `translateBundle(input, opts): Promise<TranslateResult>`.
  One concrete impl ships now: `OpenAiStructuredTranslationProvider`.
- [ ] Only `server/translate.ts` (via `@/lib/ai`) consumes the OpenAI SDK; `src/lib/ai/client.ts`
      remains the single importer of `@ai-sdk/openai`.
- [ ] The route maps typed failures to a stable `{ error: { code, message } }` shape with codes:
  `unauthenticated | bad_request | not_found | rate_limited | upstream | timeout | parse | aborted`.
- [ ] `req.signal` is forwarded to the OpenAI client so client disconnects cancel in-flight work.
- [ ] A structured server logger emits one line per request with `userId`, `latencyMs`, `provider`,
  `outcome`.
- [ ] Missing `OPENAI_API_KEY` returns `{ code: "upstream", message: "Translation provider not configured" }`
  with HTTP 502. Never crashes; never logs the key value.

## Architecture

```
route.ts
  └─ auth.api.getSession()                  // 401 if absent
  └─ zod-validate body                       // 400 if invalid
  └─ translateBundle(input, { signal })      // @/features/reading/server/translate
       └─ OpenAiStructuredTranslationProvider.translateBundle()
            ├─ generateObject({ schema: translationBundleSchema, abortSignal })
            ├─ withAITrace wraps the call
            └─ tags the result { ok: true, data } | { ok: false, error }
  └─ map tagged result → 200 DTO | typed error
```

The contract, impl, and factory live in one server-only module
(`src/features/reading/server/translate.ts`). The route imports `translateBundle`
and `ProviderTranslateInput` from that one path.

The route maps:

| Code | HTTP |
|------|------|
| `unauthenticated` | 401 |
| `bad_request` | 400 |
| `not_found` | 404 |
| `rate_limited` | 429 |
| `upstream` | 502 |
| `timeout` | 504 |
| `parse` | 502 |
| `aborted` | 499 (or 504 if 499 unavailable) |

The OpenAI client is created once per process in a module-private lazy field, reads `OPENAI_API_KEY` at
first use. Missing key is treated as `code: "upstream"`.

## Related Code Files

- Modify: `src/app/api/translate/route.ts`
- Create: `src/features/reading/server/translate.ts` — provider contract + OpenAI impl + `translateBundle` factory in one server-only module
- Delete: `src/features/reading/server/services/inline-translate.ts`
- Modify: `src/features/reading/schemas/translation.ts` — DTO + input schema
- Modify: `src/features/reading/hooks/use-word-translation.ts` — consume new response

## Implementation Steps

1. In `src/features/reading/server/translate.ts`:
   - Define `TranslationProvider` interface, `ProviderTranslateInput`, `TranslateSuccess`,
     `TranslateResult` (tagged), and `translationBundleSchema` (zod) — same shape as before.
   - Implement `OpenAiStructuredTranslationProvider` — lazy `OPENAI_API_KEY` guard, Vercel AI SDK
     `generateObject({ schema, abortSignal })`, `withAITrace` wrapper. Error mapping: missing key →
     `{ code: "upstream" }`, `AbortError` → `{ code: "aborted" }`, `NoObjectGeneratedError` →
     `{ code: "parse" }`, `APICallError` 429 → `{ code: "rate_limited" }`, 408 →
     `{ code: "timeout" }`, other API errors → `{ code: "upstream" }`.
   - Export `translateBundle(input, opts)` — singleton delegate to the concrete provider. The route
     imports this single function; the LLM client import is hidden behind it.

2. Rewrite `src/app/api/translate/route.ts`:
   - `auth.api.getSession` → `unauthenticated` 401.
   - `zod.safeParse(body)` → `bad_request` 400 on failure.
   - Call `translateBundle(input, { signal: req.signal })` from `@/features/reading/server/translate`.
   - Map tagged result to HTTP. Emit one structured log line per request (use the project's existing
     server logger — no new logger lib).

3. Replace `inline-translate.ts` import in `use-word-translation.ts` with the new bundle consumer; the
   hook now does NOT pass `ipa` / `partOfSpeech` separately — they arrive in `data`.

4. Verify `OPENAI_API_KEY` is declared in `.env.example` and `@ai-sdk/openai` is in `package.json`. No
   new installs.

## Success Criteria

- [x] `pnpm typecheck` — passes.
- [x] `pnpm lint` — passes.
- [x] `pnpm knip` — no new dead exports; the two `TranslateInput` / `TranslateFailure` types introduced
  earlier in the phase were removed because no caller consumed them (the route has its own zod schema
  for input validation, and `TranslateResult` now inlines the error shape).
- [x] Only one file imports the `@ai-sdk/openai` SDK package (`src/lib/ai/client.ts`). The provider
  imports the `openai` symbol via the `@/lib/ai` barrel, which re-exports it from `client.ts` — same
  pattern as the sibling features `upload.cefr.detect`, `studio.question.generate`,
  `upload.vocabulary.extract`.
- [x] Missing `OPENAI_API_KEY` → pre-flight guard returns `{ code: "upstream", message: "Translation
  provider not configured" }` before any SDK call. Key value never logged.
- [x] `req.signal` forwarded to `generateObject` via `abortSignal`; client disconnects map to
  `{ code: "aborted" }` (route returns 504 fallback when 499 is unavailable).
- [x] Provider error mapping complete: `unauthenticated` / `bad_request` / `not_found` /
  `rate_limited` / `upstream` / `timeout` / `parse` / `aborted`.

## File ownership diff

- Created: `src/features/reading/server/translate.ts` — `TranslationProvider` interface + zod schema
  for the LLM-returned bundle + `TranslateResult` tagged result + `OpenAiStructuredTranslationProvider`
  impl (using `@/lib/ai`'s `openai`, `getModel("inline-translate")`, `withAITrace`, `wrapUserText`) +
  `translateBundle(input, opts)` factory. Single server-only module, single SDK importer lives in
  `src/lib/ai/client.ts`.
- Rewrote: `src/app/api/translate/route.ts` — auth → JSON parse → zod → `translateBundle` → tagged
  result → HTTP. Emits one structured log line per request with `userId`, `latencyMs`, `provider`,
  `outcome`.
- Modified: `src/features/reading/schemas/translation.ts` — wire-only types (`WordSelection`,
  `PartOfSpeech`, `TranslationDto`, `TranslateErrorCode`, `TranslateErrorBody`).
- Deleted: `src/features/reading/server/services/inline-translate.ts` — replaced by
  `server/translate.ts`.
- Deleted: `src/features/reading/server/providers/` and `src/features/reading/server/services/` —
  empty after the merge.
- Hook (`src/features/reading/hooks/use-word-translation.ts`) untouched — it already uses
  `TranslationDto` structurally; the new DTO shape is a superset.
- Popup (`src/features/reading/components/inline-translation-popup.tsx`) untouched — Phase 2 already
  adopts the four-piece render.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| LLM returns malformed JSON despite `strict: true` | Provider catches JSON.parse failures → `{ code: "parse" }` → 502. The popup shows the retry button. |
| OpenAI rate-limit pushes latency past the budget | Provider maps 429 → `{ code: "rate_limited" }` → 429; popup shows retry. Documented in `docs/`. |
| Missing `OPENAI_API_KEY` in production | Missing key returns `{ code: "upstream" }` 502 with a generic message; the key value is never logged. |
| LLM hallucinated IPA | DTO allows `null`; popup hides the IPA line. |
| Provider swap mid-flight | Single-file swap behind the same `TranslationProvider` interface. |
| `openai` SDK adds bundle weight | Server-only import (`"server-only"` directive at the top of the file) — must never reach the client. |
