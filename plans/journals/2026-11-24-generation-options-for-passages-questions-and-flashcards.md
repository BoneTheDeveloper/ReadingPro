---
title: "Generation options for passages, questions and flashcards"
date: 2026-11-24
summary: "User-tunable AI generation: option schemas, per-option prompt builders, Studio popup and Import rewrite options"
---

# Generation options for passages, questions and flashcards

## What happened
Question, flashcard and passage generation used fixed prompts (5 MCQ, 5 cards, B1–B2 neutral rewrite).
Added user options end to end: UI → zod at the API edge → workflow input → prompt builder.

- Schemas: `src/shared/studio/generation-options.ts`, `passageGenerationOptionsSchema` in `src/shared/passage/schema.ts`.
- Prompts: `src/server/modules/artifact/artifact-prompts.ts` (one instruction line per option, plus normalisers), `buildPassageInstructions` in `passage/ingestion/generate.ts`.
- UI: `generate-options-dialog.tsx` (Studio popup), `rewrite-options-panel.tsx` (Import, placed above sources because picking a file uploads at once).

## Decision
- Fill-in-the-blank is choice-based (4 words), and True/False/Not Given options are forced server-side, so grading and the numeric progress schema stay unchanged.
- No DB migration: options are only needed at generation time and travel in the workflow input. Old rows parse via schema defaults (`format` → MULTIPLE_CHOICE, `example` nullish).
- Model output is normalised (dedupe, drop out-of-range answers, trim to count) and re-validated; an empty result fails the artifact.

## Next steps
- Quota still charges one unit per set regardless of size (15 questions = 5 questions).
- Options are not stored on the artifact, so tiles cannot show "10 câu · Khó" yet.
- Prompt quality for HARD and FILL_BLANK needs a manual check against real passages.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
