---
title: "Phase 1: Research LLM Structured Output"
status: todo
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Research LLM Structured Output

## Overview

Verify OpenAI's `response_format: json_schema` behavior with the bundle DTO and capture a tight prompt +
schema pair that returns `{ translation, ipa, partOfSpeech }` reliably for en→vi headwords. The
implementation phase ships this verbatim.

## Requirements

- [ ] Probe OpenAI with at least three English words (`gesture`, `priority`, `synchronize`) using JSON
  schema and confirm the response shape matches `{ translation: string, ipa: string|null, partOfSpeech:
  string }`.
- [ ] Capture the prompt and the JSON schema in `research.md` so Phase 3 implements against verified behavior.
- [ ] Record latency floor (p50) and approximate cost per call for `gpt-4o-mini` and `gpt-4.1-mini`.
- [ ] Note hallucination risk: what the LLM returns for IPA on rare / proper-noun / non-English words.
- [ ] Document the failover list: which other providers can replace OpenAI one-for-one behind the same
  interface (Anthropic Claude with tool use, Google Gemini with `responseSchema`).
- [ ] Confirm whether `OPENAI_API_KEY` is already configured anywhere (env, .env.example, README,
  docs); if not, Phase 4 documents the requirement.

## Architecture

This is research-only — no production code change. Live probes confirm the LLM call works end-to-end and
the JSON schema is honored.

Probe shape:

```ts
const response = await openai.responses.create({
  model: "gpt-4o-mini",
  input: [{ role: "user", content: prompt }],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "translation_bundle",
      strict: true,
      schema: {
        type: "object",
        properties: {
          translation: { type: "string" },
          ipa: { type: ["string", "null"] },
          partOfSpeech: {
            type: "string",
            enum: ["noun","verb","adjective","adverb","pronoun","preposition","conjunction","interjection","determiner","unknown"],
          },
        },
        required: ["translation","ipa","partOfSpeech"],
        additionalProperties: false,
      },
    },
  },
});
```

Prompt settled during this phase (final wording lives in `research.md`):

```
You are translating a single English headword from a study passage.

Word: ${word}
Surrounding sentence: ${context}
Source language: en
Target language: vi

Return one JSON object matching the schema. Translate the word into Vietnamese following how the
surrounding sentence uses it. Provide IPA in General American or British English for the *meaning*
implied by the sentence (not every dictionary sense). Set partOfSpeech to the part of speech that
matches the usage in the sentence. If you cannot produce a confident IPA, set it to null.
```

**Failover list (documented, not implemented now):**

| Provider | Mechanism | Same interface? | Notes |
|---|---|---|---|
| OpenAI (`gpt-4o-mini`, `gpt-4.1-mini`) | `response_format: json_schema` | Yes — primary | Picked for this plan. |
| Anthropic Claude | Tool use (`input_schema`) | Yes | Tool-call result is structured JSON. |
| Google Gemini | `responseSchema` (Vertex / Gemini API) | Yes | Same JSON-schema dialect. |
| Local LLM (Ollama) | Function calling | Partial | Quality varies; not recommended for production. |

## Related Code Files

- Create: `plans/260727-1406-translate-api-redesign-from-ui-render/research.md`

## Implementation Steps

1. With a personal `OPENAI_API_KEY`, run three probe calls against `gpt-4o-mini` and capture responses +
   latency + token counts.
2. Try one adversarial word (a proper noun, e.g. `Kubernetes`) and one multi-sense word (e.g. `set`) and
   record the LLM's behavior.
3. Finalize the prompt and JSON schema and paste them into `research.md`.
4. Confirm `OPENAI_API_KEY` is not already declared in `.env.example` or repo docs; if absent, list it as
   a Phase 4 doc change.

## Success Criteria

- [ ] `research.md` contains a working prompt, JSON schema, three probe responses, and a failover list.
- [ ] Phase 3 implementation can copy-paste the prompt + schema and not re-research.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| OpenAI rate-limit during probes | Use a development key; probes are <10 calls. |
| LLM ignores `partOfSpeech` enum | `strict: true` schema enforces the enum; a parse error becomes `code: "parse"` → 502. |
| Hallucinated IPA | Schema allows `null`; UI hides the IPA line when null. |
