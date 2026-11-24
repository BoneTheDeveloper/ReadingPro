# Generation options for passages, questions and flashcards

Status: done (uncommitted) · Branch: `bone/feat/studio-ui-progress`

## Outcome
Users choose how AI generates each artifact. Options travel from UI → API (zod) →
workflow input → prompt builder. No DB migration: options are only needed at
generation time; content/progress stay JSONB.

## Options
| Type | Options |
|---|---|
| Passage (in Import modal) | target CEFR (keep/A2–C1), tone, length, source fidelity |
| Questions (popup) | count 3/5/10/15, difficulty, formats (MCQ, True/False/Not Given, fill-blank), focus skills, explanation language |
| Flashcards (popup) | count 5/10/15/20, content type, difficulty, back side (VI/EN definition, example) |

## Contracts
- `src/shared/studio/generation-options.ts`: question + flashcard option schemas with defaults.
- `questionItemSchema` gains `format` (default MULTIPLE_CHOICE for old rows); options 2–4 with `correctIndex < options.length`. Fill-blank is choice-based (4 words) so grading and progress stay numeric.
- `flashcardItemSchema` gains optional `example`; deck size 1–20.
- `CreatePassageInputSchema` variants gain optional `options`.

## Acceptance
- Defaults reproduce today's behaviour (5 MCQ, 5 cards, B1–B2 neutral passage).
- Old artifacts still parse and render.
- Typecheck, lint, tests pass.
