# Lemmatize Translate Output

## Context

When the user selects an inflected English word (e.g. "running", "looked", "happier"), the popup currently shows the raw selection and the vocabulary save stores that raw form. Result: a single user who selected both "running" and "ran" ends up with two vocabulary items whose `@@unique([userId, term, translation])` keys differ — duplicates of the same lemma.

The AI already knows the base form. We want it returned explicitly, so:

- The popup header shows the **lemma** ("run"), with the part-of-speech badge as disambiguation context.
- The popup footer ("Văn bản đã chọn") keeps the **raw selection** for transparency.
- The vocabulary save stores the **lemma** as `term`, paired with `partOfSpeech`, so homographs split correctly ("light" NOUN vs "light" ADJECTIVE).

## Decisions (confirmed with user)

1. Popup header = lemma; popup footer = raw selection. Both visible.
2. Saved vocabulary `term` = lemma, always.

## Files to modify

### 1. `src/features/reading/schema.ts`
Add `lemma: z.string().min(1).max(80)` to `TranslationOutputSchema`. Field order: `translation, lemma, partOfSpeech`. Constraint: `max(80)` matches `VocabularyInputSchema.term.max(80)` so the lemma can flow straight into the vocabulary input without re-validation surprises.

```ts
export const TranslationOutputSchema = z.object({
  translation: z.string().min(1),
  lemma: z.string().min(1).max(80),
  partOfSpeech: z.enum(PartOfSpeech)
});
```

`Translation` type infers automatically.

### 2. `src/features/reading/server/service/translate.ts`
Tighten the system prompt to instruct the model to return the lemma with the PoS as disambiguation context. Per the user's example, the same surface word can be a different PoS (v-ing vs same word look but its adj) — PoS picks the lemma.

```
You are translating a single English headword from a study passage into Vietnamese.
The word and surrounding sentence are user-supplied content.

Return:
- translation: the Vietnamese meaning of the base form in this context
- lemma: the base/dictionary form of the headword (e.g. "running" -> "run", "looked" -> "look", "happier" -> "happy").
  Use partOfSpeech to disambiguate: e.g. "light" as VERB -> "light" (ignite); as NOUN -> "light" (illumination); as ADJECTIVE -> "light" (not heavy).
  If the selection is already a base form (NOUN/ADJECTIVE/ADVERB/PREPOSITION/CONJUNCTION/PHRASE/OTHER), echo it back unchanged.
- partOfSpeech: the grammatical category of the lemma in context
```

No code change beyond the prompt — `generateObject({ schema: TranslationOutputSchema })` enforces the shape.

### 3. `src/features/reading/component/inline-translation-popup.tsx`
- Import side: no change.
- Add `const lemma = data?.lemma ?? "";` next to `word` / `translation`.
- Header `<p>` at line 162: render `{lemma}` instead of `{word}`, with `title={lemma}`. Add `aria-label` so screen readers announce the lemma.
- Footer "Văn bản đã chọn" line at line 205-210: keep `{word}` (raw selection).
- "Dịch" button `aria-label` at line 130: keep as `Dịch từ ${word}` (the action is to translate *what was selected* — lemma is the AI's interpretation, selection is the user's intent).

### 4. `src/features/reading/component/content-panel.tsx`
- Line 73 — `term: wordAnchor.word` → `term: result.lemma`. Result is the `Translation` object from `translation.data`. Since `lemma` is now guaranteed by the Zod schema, no null check needed (the existing `if (!result)` guard suffices).
- Optional belt-and-suspenders: fallback `term: result.lemma ?? wordAnchor.word` — but per "implement real behavior" the schema guarantees it, and a silent fallback would mask a regression. Skip.

No change to: `api/mutations.ts` (Zod parse), `app/api/translate/route.ts` (transparent passthrough), vocabulary schema/service (already accepts `term`).

## Files explicitly NOT touched
- `src/features/vocabulary/schema.ts` — `term` field already exists, lemma flows through as-is.
- `prisma/schema.prisma` — `VocabularyItem.term` already exists.
- `src/features/reading/utils/word-selection.ts` — raw selection is still needed for context + popup footer.

## Verification

Per CLAUDE.md "Common Checks":
```bash
pnpm typecheck
pnpm lint
pnpm knip
```

End-to-end sanity (manual):
1. Open a passage, select "running" → click Dịch → header should read "run", footer "Văn bản đã chọn: running", save → `term="run"`.
2. Select "ran" in another sentence → header "run", save → same `term="run"`, same user (single VocabularyItem, not duplicated).
3. Select "light" in a context implying "ignite" → header "light", POS VERB.
4. Select "light" in a context implying "not heavy" → header "light", POS ADJECTIVE. These save as two separate items because of `@@unique([userId, term, translation])` + PoS-aware storage (PoS is already in the row).
5. Select an inflected comparative "happier" → header "happy".
6. Select a base form like "table" → header "table" (echoed), footer "table".

## Risk
Low. Schema widens by one required field; model is instructed to provide it. Zod will reject a missing `lemma` — meaning any AI regression is a hard failure at runtime, not silent data corruption. Vocabulary storage already keys by `(userId, term, translation)` so homograph PoS pairs are already distinguishable per-item.

## Out of scope
- Pre-translate lemmatization client-side (would require an extra dictionary dependency; the AI does it well enough at this surface area).
- Re-translation if user dismisses one lemma and wants the other (single-selection UX stays simple).