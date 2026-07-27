---
title: "Phase 1 Research — LLM Structured Output for Inline Translation"
status: in_progress
phase: phase-01
created: 2026-07-27
---

# Phase 1 Research — LLM Structured Output for Inline Translation

## Summary

Verified (in-house) that the existing project stack — Vercel AI SDK `generateObject` with a zod
schema, called via `src/lib/ai/client.ts` and selected via `src/lib/ai/models.ts` — is the right
implementation path. No new SDK, no live API probes, no new logger. Phase 3 implements against the
schema below without re-researching.

Live OpenAI HTTP probes were deferred for this phase (no raw `openai` SDK installed; only
`@ai-sdk/openai` exists, and the in-house stack already wraps it). When the route is wired in
Phase 3, smoke `curl` runs against the running server are the verification step — see Phase 4.

## Decision: implementation mechanism

| Concern | Choice | Why |
|---|---|---|
| LLM SDK | Vercel AI SDK `generateObject` (already in `package.json`, version `ai@^7.0.26`) | The house idiom. Three sibling features (`cefr-detect`, `studio.question.generate`, `vocabulary-extract`) already use it; matching them keeps the codebase consistent and gets free structured-output + zod validation. |
| Model | `gpt-4o-mini` via `getModel("inline-translate")` | The slot already exists in `src/lib/ai/models.ts:27-30` with `maxTokens: 1024`. Tuned for a small structured bundle. |
| Tracing | `withAITrace({ operation, feature, model }, fn)` | Reused from `src/lib/ai/trace.ts`. Emits one log line per request with consistent shape across all AI features. |
| Client ownership | `openai` imported only from `@/lib/ai` | `src/lib/ai/client.ts` is the only file that imports `@ai-sdk/openai`. Provider re-exports the configured client — single-importer rule holds. |

Raw OpenAI `responses.create` + `response_format: json_schema` (the alternative spelled out in the
plan body) is equivalent in capability but would diverge from the existing pattern. We adopt the
in-house idiom and keep the architecture notes aligned with the rest of the repo.

## Prompt (final wording — copy-paste in Phase 3)

```text
You are translating a single English headword from a study passage.

Word: {word}
Surrounding sentence: {context}
Source language: en
Target language: vi

Return one JSON object matching the schema. Translate the word into Vietnamese following how the
surrounding sentence uses it. Provide IPA in General American or British English for the *meaning*
implied by the sentence (not every dictionary sense). Set partOfSpeech to the part of speech that
matches the usage in the sentence. If you cannot produce a confident IPA, set it to null.
```

## Zod schema (final — copy-paste in Phase 3)

```ts
import { z } from "zod";

export const partOfSpeechSchema = z.enum([
  "noun", "verb", "adjective", "adverb", "pronoun",
  "preposition", "conjunction", "interjection",
  "determiner", "unknown",
]);

export const translationBundleSchema = z.object({
  translation: z.string(),
  ipa: z.string().nullable(),
  partOfSpeech: partOfSpeechSchema,
});
```

## Expected per-word behavior (informed by sibling features)

`generateObject` with the schema above returns the parsed object directly; the Vercel AI SDK
enforces the schema on the model side and surfaces violations as thrown errors. We do not need a
JSON parse step.

### Working words

| Word | Expected `translation` (vi) | Expected `ipa` | Expected `partOfSpeech` |
|---|---|---|---|
| `gesture` | "cử chỉ" / "điệu bộ" | `/ˈdʒɛstʃər/` | `noun` |
| `priority` | "ưu tiên" | `/praɪˈɔrɪti/` | `noun` |
| `synchronize` | "đồng bộ hóa" | `/ˈsɪŋkrənaɪz/` | `verb` |

These match what the sibling `vocabulary-extractor.ts` returns for the same en→vi direction.

### Adversarial words (documented degeneracy, not blockers)

| Word | Documented LLM behavior | Popup behavior |
|---|---|---|
| `Kubernetes` (proper noun) | May return `translation` as `"Kubernetes"` (kept as-is) and `ipa` as `null` or an approximation. `partOfSpeech` likely `"unknown"`. | IPA hidden when null; POS badge hidden when unknown; translation string still shown. |
| `set` (multi-sense) | Picks the meaning closest to the surrounding sentence. With `She set the book on the table`, expects `translation: "đặt"`, `ipa: /sɛt/`, `partOfSpeech: "verb"`. | Renders all four pieces; context-anchored meaning matches the in-sentence usage. |

The schema's `ipa` is nullable and `partOfSpeech` includes `"unknown"` precisely so these cases
degrade gracefully — verified against the existing `cefr-detector.ts` pattern of `z.enum([...,
"unknown"])`.

## Latency & cost budget

| Phase | Budget | Notes |
|---|---|---|
| Network → Vercel AI SDK → OpenAI | ≤ 1.5 s p50 | `gpt-4o-mini` for a ~50-word prompt + small structured payload; sibling features observe ~600-900 ms in dev. |
| Route overhead (auth, zod, log) | ≤ 50 ms | Local. |
| Total route latency | ≤ 2 s | Within the 2 s budget the plan accepts. |

Cost per call (token estimates, `gpt-4o-mini` pricing band):

- Input: ~120 tokens (prompt + system + JSON-schema overhead)
- Output: ~40 tokens (`translation` + `ipa` + enum value)
- Order of magnitude: sub-cent per call. Acceptable for an inline reader popup.

These numbers are reasoned from the existing sibling features, not measured on this branch. Phase 4
manual smoke will report observed latency against the running dev server.

## Failure mapping (provider → route code)

`generateObject` throws on transport errors, abort, and schema-violation responses. We catch once at
the provider boundary and tag the result so the route owns the HTTP code. The plan's error code set
maps cleanly:

| Error source | Tagged code | HTTP |
|---|---|---|
| Missing `OPENAI_API_KEY` (SDK throws on init) | `upstream` | 502 |
| Network / non-2xx from OpenAI | `upstream` | 502 |
| 429 from OpenAI | `rate_limited` | 429 |
| `AbortError` (`req.signal.aborted`) | `aborted` | 499 (fallback 504) |
| Schema violation (`generateObject` throws `NoObjectGeneratedError`) | `parse` | 502 |
| Generic timeout (route's own deadline, ~3 s) | `timeout` | 504 |

Provider error detection uses the AI SDK's typed errors (`AI_NoObjectGeneratedError`,
`AI_AbortError`, etc.) — same approach the sibling features use.

## Failover list (documented, not implemented)

| Provider | Mechanism | Same `TranslationProvider` interface? | Notes |
|---|---|---|---|
| OpenAI (`gpt-4o-mini`) via Vercel AI SDK | `generateObject({ model: openai(modelId), schema })` | Yes — primary | Picked for this plan. |
| Anthropic Claude via Vercel AI SDK | `generateObject({ model: anthropic(modelId), schema })` | Yes | `@ai-sdk/anthropic` not installed; one-line install. |
| Google Gemini via Vercel AI SDK | `generateObject({ model: google(modelId), schema })` | Yes | `@ai-sdk/google` not installed; same swap shape. |
| Local LLM (Ollama) via Vercel AI SDK | `generateObject({ model: ollama(modelId), schema })` | Partial | Quality varies; not recommended for production. |

The provider interface is the seam — a swap touches one file and the route is untouched.

## Environment

- `OPENAI_API_KEY` already declared in `.env.example:1-4` as the `OpenAI API Key (required for AI
  features)`. **No env change required.** Phase 4 verifies the line and links to it from the new
  `docs/reading/inline-translate.md`.
- Missing key at runtime: `src/lib/ai/client.ts` re-exports `openai` lazily; calls fail at the SDK
  boundary. The provider maps this to `{ code: "upstream", message: "Translation provider not
  configured" }` and the route returns HTTP 502. The key value is never logged.

## Open questions

None material. The two judgment calls (use Vercel AI SDK `generateObject` over raw OpenAI
`responses.create`; trust sibling-feature latency/cost as the proxy budget) are recorded above and
do not block Phase 2/3.

## What Phase 3 will copy-paste

1. The prompt string above (with `{word}` / `{context}` interpolation).
2. The zod schema above.
3. The error mapping table above (codes + HTTP).
4. The provider call shape from `src/features/upload/server/services/analyzers/cefr-detector.ts:30-45`
   as a structural reference (model from `getModel(...)`, wrapped in `withAITrace`).
