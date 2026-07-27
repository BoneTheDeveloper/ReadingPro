---
title: "Phase 3: Route + LLM Provider"
status: in_progress
priority: P1
effort: "1d"
dependencies: [phase-01, phase-02]
started: 2026-07-27
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
- [ ] Only `openai-structured-translation.ts` imports the `openai` SDK.
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
  └─ translateBundle(input, { signal })      // provider interface
       └─ OpenAiStructuredTranslationProvider.translateBundle()
            ├─ responses.create({ ..., response_format: json_schema })
            ├─ JSON.parse(response.output_text)
            └─ safeParse against zod DTO
       └─ returns tagged result
  └─ map tagged result → 200 DTO | typed error
```

The provider abstraction is a single interface in `providers/translation-provider.ts`. The bundle
service in `services/translation-bundle.ts` is a thin adapter that:

1. Calls the provider.
2. Validates the response against the DTO zod schema.
3. Tags the result with `{ ok: true, data }` or `{ ok: false, code, message }`.

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
- Create: `src/features/reading/server/providers/translation-provider.ts` (interface)
- Create: `src/features/reading/server/providers/openai-structured-translation.ts` (impl)
- Create: `src/features/reading/server/services/translation-bundle.ts` (thin adapter)
- Delete: `src/features/reading/server/services/inline-translate.ts`
- Modify: `src/features/reading/schemas/translation.ts` — DTO + input schema
- Modify: `src/features/reading/hooks/use-word-translation.ts` — consume new response

## Implementation Steps

1. Define `TranslationProvider` interface in `providers/translation-provider.ts`:

   ```ts
   export interface TranslateInput {
     text: string;
     context: string;
     sourceLanguage: "en";
     targetLanguage: "vi";
   }

   export type TranslateResult =
     | { ok: true; data: { translation: string; ipa: string | null; partOfSpeech: PartOfSpeech } }
     | { ok: false; code: TranslateErrorCode; message: string };

   export interface TranslationProvider {
     translateBundle(input: TranslateInput, opts: { signal: AbortSignal }): Promise<TranslateResult>;
   }
   ```

2. Implement `OpenAiStructuredTranslationProvider` in
   `providers/openai-structured-translation.ts`. Reads `OPENAI_API_KEY` lazily, calls
   `openai.responses.create({ model: "gpt-4o-mini", input, response_format: json_schema })`, parses
   `output_text` into the DTO, validates with the same zod schema the route exports, returns a tagged
   result. Maps `AbortError` → `{ code: "aborted" }`, `TimeoutError` → `{ code: "timeout" }`,
   rate-limit HTTP 429 → `{ code: "rate_limited" }`, JSON parse failure → `{ code: "parse" }`,
   missing key → `{ code: "upstream", message: "Translation provider not configured" }`.

3. Implement `translateBundle(input, opts)` in `services/translation-bundle.ts` — thin call to the
   provider; the route depends on this module so the LLM client import is hidden behind it.

4. Rewrite `src/app/api/translate/route.ts`:
   - `auth.api.getSession` → `unauthenticated` 401.
   - `zod.safeParse(body)` → `bad_request` 400 on failure.
   - Call `translateBundle(input, { signal: req.signal })`.
   - Map tagged result to HTTP. Emit one structured log line per request (use the project's existing
     server logger — no new logger lib).

5. Replace `inline-translate.ts` import in `use-word-translation.ts` with the new bundle consumer; the
   hook now does NOT pass `ipa` / `partOfSpeech` separately — they arrive in `data`.

6. Add `OPENAI_API_KEY` to `.env.example` (or equivalent), and `openai` to `package.json` if not already
   present. Verify version range against current Next.js compatibility.

## Success Criteria

- [ ] `curl -X POST /api/translate` returns 200 with the four-piece bundle.
- [ ] Cancelling the client request no longer holds the LLM call open.
- [ ] Only one file imports `openai` (grep `openai` under `src/` returns exactly one match).
- [ ] With `OPENAI_API_KEY` unset, the route returns 502 `{ code: "upstream", message: "Translation provider not configured" }`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm knip` pass.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| LLM returns malformed JSON despite `strict: true` | Provider catches JSON.parse failures → `{ code: "parse" }` → 502. The popup shows the retry button. |
| OpenAI rate-limit pushes latency past the budget | Provider maps 429 → `{ code: "rate_limited" }` → 429; popup shows retry. Documented in `docs/`. |
| Missing `OPENAI_API_KEY` in production | Missing key returns `{ code: "upstream" }` 502 with a generic message; the key value is never logged. |
| LLM hallucinated IPA | DTO allows `null`; popup hides the IPA line. |
| Provider swap mid-flight | Single-file swap behind the same `TranslationProvider` interface. |
| `openai` SDK adds bundle weight | Server-only import (`"server-only"` directive at the top of the file) — must never reach the client. |
