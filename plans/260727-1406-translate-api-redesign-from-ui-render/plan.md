---
title: "Translate API Redesign From UI Render — LLM Bundle"
description: "Rebuild POST /api/translate so the inline-translation popup shows word + IPA + Vietnamese translation + part-of-speech in a single round trip, served by one OpenAI call with structured JSON output. No audio, no attribution in the popup."
status: in_progress
priority: P1
effort: "2d"
branch: preview
tags: [feature, reading, api, frontend, refactor, llm]
created: 2026-07-27
updated: 2026-07-27
---

# Translate API Redesign From UI Render — LLM Bundle

## Overview

The current inline-translation popup only renders the source word and the translated string. The
"wanting result" is a four-piece render: **word (large) + IPA (small) + Vietnamese translation (medium) +
part-of-speech badge**. The current `POST /api/translate` ships only a translation string, with `ipa`
hardcoded to `null` and no POS at all.

This plan redesigns the route, the server provider, and the popup so **one server-side LLM call**
(OpenAI, structured JSON output) returns `{ translation, ipa, partOfSpeech }`, and the popup renders all
four pieces. **No audio** in this redesign — audio is deferred to a later plan. **No attribution in the
popup** — keep it a translate-only popup. **MyMemory daily cap is acceptable** for the MVP and is not
addressed here (no MyMemory dependency stays in this plan).

The redesign starts from the UI render (the visible result the user wants), then traces backwards to the
DTO the popup needs, then to the route, then to the provider.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Popup renders word + IPA + Vietnamese translation + POS badge in one shot | P1 |
| 2 | `POST /api/translate` returns `{ translation, ipa, partOfSpeech }` in one response | P1 |
| 3 | Single round trip from the browser; one upstream LLM call inside the route | P1 |
| 4 | Provider lives behind a small interface so an LLM swap is local | P1 |
| 5 | Auth, error mapping, abort passthrough, and structured log at the route | P2 |
| 6 | `pnpm typecheck`, `pnpm lint`, `pnpm knip` stay green | P2 |

## Non-Goals

- Audio playback, attribution lines, source/license display in the popup.
- Persistent (DB / KV) translation cache. The DTO keeps its `provider` slot; a real cache is a later plan.
- Multi-word phrase translation. The validation input is single-headword only.
- Saving the translated word to the vocabulary feature (`use-store-vocabulary`).
- PDF / video mode translation.
- New test runner; verification uses `pnpm typecheck`, `pnpm lint`, `pnpm knip`, and one Playwright walk-through.
- Streaming responses. A non-streamed structured JSON call is enough at the current volume.

## Acceptance Criteria

1. `POST /api/translate` returns 200 with `translation` (string), `ipa` (string \| null),
   `partOfSpeech` (one of a fixed enum), `provider` (string literal `openai`).
2. Selecting exactly one English word, clicking the inline icon, opens a popup showing word + IPA + POS
   badge + translation; partial responses degrade gracefully (IPA line hidden when `ipa` is `null`;
   POS badge hidden when `partOfSpeech === "unknown"`).
3. The popup makes exactly one fetch to `/api/translate` per click.
4. The provider abstraction hides the OpenAI client from the route; only one file imports `openai`.
5. Client disconnect (`AbortController.abort()`) cancels the in-flight LLM call; no orphaned work.
6. Typed failures from the provider surface as a stable `{ error: { code, message } }` shape with codes:
   `unauthenticated | bad_request | not_found | rate_limited | upstream | timeout | parse | aborted`.
7. `pnpm typecheck`, `pnpm lint`, `pnpm knip` all pass.
8. Playwright walk-through screenshot saved under `test-results/`.
9. The popup never renders a "Google Translate", "Free Dictionary", "OpenAI", or any provider label.
   The "Google Translate" footer line in the current popup is removed.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Research LLM Structured Output](./phase-01-research-provider-candidates.md) | Completed |
| 2 | [UI Render Contract & Popup Reshape](./phase-02-ui-render-contract.md) | Completed |
| 3 | [Route + LLM Provider](./phase-03-route-and-service-rebuild.md) | Completed |
| 4 | [Verification, Manual Smoke, & Docs](./phase-04-verification-and-docs.md) | In Progress |

### Status notes (2026-07-27)

- Phase 1 in progress: scout complete. Project already centralizes OpenAI access
  via `src/lib/ai/client.ts` + `src/lib/ai/models.ts` (which exposes a
  `inline-translate` slot → `gpt-4o-mini`, maxTokens 1024) and existing
  AI features use Vercel AI SDK `generateObject` with a zod schema, wrapped in
  `withAITrace`. Phase 3 will reuse that idiom instead of raw OpenAI
  `responses.create` so the "only one file imports `openai`" rule still holds
  (single SDK importer lives in `src/lib/ai/client.ts`) and the new feature
  fits the existing trace + model-registry pattern.
- `OPENAI_API_KEY` already declared in `.env.example` — no env change needed
  there. Phase 4 will keep the existing line as-is and just link to it from the
  new `docs/reading/inline-translate.md`.
- No `docs/reading/inline-translate.md` exists today. Phase 4 will **create** it,
  not modify.
- The current `inline-translate.ts` Google Translate footer line is rendered at
  `src/features/reading/components/inline-translation-popup.tsx:150-152` —
  confirmed target for the no-attribution contract.

## Architectural Notes

- **Order of work matters.** Phase 1 (research into OpenAI structured output) and Phase 2 (popup DTO +
  render) unblock Phase 3. Phase 3 builds the route and provider against the DTO Phase 2 adopts. Phase 4
  verifies the full chain.
- **Single round trip, single LLM call.** The browser sees one `POST /api/translate`. Inside the route, one
  Vercel AI SDK `generateObject` call returns a structured JSON object via its zod schema (the project's
  existing idiom across `cefr-detect`, `studio.question.generate`, `vocabulary-extract`). No
  fan-out, no second upstream.
- **Provider behind an interface.** `TranslationProvider` declares
  `translateBundle(input, { signal }) -> Promise<TranslateResult>`. One concrete impl ships now
  (`OpenAiStructuredTranslationProvider`); a swap to Gemini/Claude/local touches one file.
- **Reuse the in-house AI stack.** The new provider imports `openai` only from `@/lib/ai` (which is itself
  the only `openai` SDK importer in the repo via `src/lib/ai/client.ts`), picks the model via
  `getModel("inline-translate")`, and wraps the call in `withAITrace` so the new flow shows up the
  same way other AI features do. No new SDK installs, no new logger.
- **No attribution in the popup.** The popup is a translate popup, not a credits surface. We do not pass
  provider labels, license info, or source URLs into the UI. Any compliance with third-party licenses is
  internal-only (e.g., logged, not rendered).
- **Failure surface is structural.** The route maps tagged results to typed codes, not to a single "Not
  found" string. The popup keeps its retry button on `error` and a soft empty on `success` with empty
  `translation`.
- **Environment:** `OPENAI_API_KEY` is required at runtime. Missing key returns `{ code: "upstream" }`
  with `502`. Documented in `docs/`.

## File Ownership Summary

| Action | File | Reason |
|--------|------|-------|
| Create | `src/features/reading/server/translate.ts` | Provider contract + OpenAI impl + `translateBundle` factory in one server-only module |
| Modify | `src/app/api/translate/route.ts` | Single-step route, typed errors |
| Modify | `src/features/reading/schemas/translation.ts` | DTO + input schema for the bundle |
| Modify | `src/features/reading/hooks/use-word-translation.ts` | Consume new response |
| Modify | `src/features/reading/components/inline-translation-popup.tsx` | Four-piece render (word / IPA / translation / POS badge) — **drop the "Google Translate" footer** |
| Delete | `src/features/reading/server/services/inline-translate.ts` | Replaced by `server/translate.ts` |
| Create | `plans/260727-1406-translate-api-redesign-from-ui-render/research.md` | LLM provider + JSON-schema prompt + cost/latency notes |
| Modify | `.env.example` (or equivalent) | `OPENAI_API_KEY` already present — no change needed; verify in Phase 4 |
| Create | `docs/reading/inline-translate.md` | Link to the canonical DTO in `translation.ts`; calls out `OPENAI_API_KEY` requirement |

## Risks

| Risk | Mitigation |
|------|------------|
| OpenAI throttle / outage | Single-file swap to another structured-output-capable LLM. Documented fallback list in `research.md`. |
| LLM returns malformed JSON despite `response_format` | Route parses with `safeParse`; falls through to `code: "parse"` → 502 with retry. |
| LLM latency pushes the popup past 1.5 s | Documented budget is 2 s for the LLM call. Acceptable for an inline reader; popup shows "Đang dịch…" the whole time. |
| `OPENAI_API_KEY` missing in production | Route returns `{ code: "upstream" }` 502; documented in `docs/`; no client crash. |
| LLM hallucination of IPA | Use `gpt-4o-mini`/`gpt-4.1-mini` with `response_format: json_schema`; allowed `null` for IPA; user-visible degeneracy documented. |
| Provider swap mid-flight | Provider interface is the only contract the route depends on. |
| Client disconnects after LLM token spend | Abort signal forwarded to the OpenAI client; `OPENAI_ABORTED` mapped to `code: "aborted"` → 499. |
| knip flags the deleted `inline-translate.ts` | All importers updated; grep before commit. |

## Validation Strategy

- `pnpm typecheck` — must pass after Phase 3.
- `pnpm lint` — must pass after Phase 3.
- `pnpm knip` — must not show new dead exports; verifies `inline-translate.ts` deletion is clean.
- Provider smoke: three `curl` calls against the running server with different English words (`gesture`,
  `priority`, `synchronize`); inspect JSON for non-empty `translation`, populated `ipa`, populated
  `partOfSpeech`.
- LLM guardrail test: with the LLM client stubbed to return `{ translation: "", ipa: null, partOfSpeech:
  "unknown" }`, the popup renders the empty state (not the success state). Achieved via a tiny injectable
  helper; no test runner added.
- Playwright walk-through: single-word selection → icon → click → popup shows word + IPA + POS + translation;
  **no provider label visible**. Screenshot stored under `test-results/`.

## Cross-Plan Dependencies

| Relationship | Plan | Status |
|--------------|------|--------|
| Builds on | `plans/260727-1146-inline-word-translate` | Pending — shares `inline-translation-popup.tsx`, `use-word-translation.ts`, `translation.ts`. The new plan rewrites them; the prior plan will be archived after this one ships. |
| Independent of | `plans/260726-1523-studio-artifact-row-cache` | Pending — no shared files. |

## Out of Scope for This Plan

- Persistent server-side cache. The DTO's `provider` slot stays, but no `cache` or `fallback` value is
  emitted until a real cache is added.
- Audio playback or any audio source. Deferred to a later plan.
- Attribution lines, source URLs, license labels, or any provider branding in the popup.
- A standalone translate / dictionary page (US-13).
- New tests beyond the existing minimum (`typecheck`, `lint`, `knip`).
- MyMemory fallback. Any translation-only fallback is a later plan.
