# Drop IPA + Audio Placeholder from Reading Translation

## Context

`inline-translation-popup.tsx` currently renders two things that aren't real product features yet:

1. **IPA span** — phonetic transcription sourced from the AI (`TranslationOutputSchema.ipa`). Useful long-term but not required by the vocabulary save flow, and consumes output tokens on every call.
2. **Volume2 audio button** — a placeholder with no `onClick`, no playback logic. Per project memory "UI-only means no logic" and "Prefer minimal scope," a button without behavior shouldn't ship as a feature surface.

The user wants IPA dropped end-to-end (schema, AI prompt, UI) and the placeholder audio button removed. `word-selection.ts` was named in the request but is unrelated — it only validates DOM word selections and contains neither IPA nor audio. Confirmed via grep.

Scope confirmed with user: **drop IPA everywhere** (schema + AI prompt + popup + vocabulary surface), and **edit `inline-translation-popup.tsx`**, not `word-selection.ts`.

## What IPA actually touches

Comprehensive grep (`grep -rni "ipa" src/ prisma/` excluding generated Prisma noise) confirms IPA only lives in two source files:

- `src/features/reading/schema.ts:20` — `ipa: z.string().nullable()` in `TranslationOutputSchema`
- `src/features/reading/component/inline-translation-popup.tsx` — read at line 110, rendered at lines 173-177

No reference in: `vocabulary/schema.ts`, `vocabulary/api/mutations.ts`, `app/api/vocabulary/route.ts`, `prisma/schema.prisma`, `features/vocabulary/server/services/*`. Removing IPA from `Translation` will not break the vocabulary save flow — that flow uses `translation.translation` and `translation.partOfSpeech` only (see `content-panel.tsx:73-78`).

The audio placeholder is purely a `<button>` + `<Volume2>` JSX node with no handlers. Lines 178-183 in `inline-translation-popup.tsx`.

## Files to modify

### 1. `src/features/reading/schema.ts`
Drop `ipa` from `TranslationOutputSchema`:
```ts
export const TranslationOutputSchema = z.object({
  translation: z.string().min(1),
  partOfSpeech: z.enum(PartOfSpeech)
});
```
`Translation` type infers automatically — `partOfSpeech` stays, `ipa` gone.

### 2. `src/features/reading/server/service/translate.ts`
No code change required beyond the schema. `generateObject({ schema: TranslationOutputSchema })` will stop asking the model for IPA. Optionally tighten `TRANSLATION_SYSTEM_PROMPT` to mention it should not include IPA — but the Zod schema rejects it anyway, so this is optional polish. **Skip the prompt change** (YAGNI: schema is the contract).

### 3. `src/features/reading/component/inline-translation-popup.tsx`
Three edits, all in one JSX block:
- Line 14: remove `Volume2` from the lucide-react import.
- Line 110: remove `const ipa = data?.ipa ?? null;`.
- Lines 172-184: collapse the `<div className="mt-1.5 flex flex-wrap items-center gap-[7px]">` block. It only contained the IPA span + audio button — both deleted — so the wrapper div goes too. The `posBadge` `<span>` block below it stays.

After: the popup head section between the word and the part-of-speech badge is empty for translations (just `translation` shows below the border-t). That matches the request: pure translation, no audio, no IPA.

## Files explicitly NOT touched
- `src/features/reading/utils/word-selection.ts` — no IPA, no audio; user's mention was a typo.
- `src/features/vocabulary/**` — no IPA dependency (verified by grep).
- `src/app/api/translate/route.ts` — no IPA reference; schema change propagates via `translateWord`'s return type.
- `src/app/api/vocabulary/route.ts` — untouched.

## Verification

Per CLAUDE.md "Common Checks":
```bash
pnpm typecheck
pnpm lint
pnpm knip
```

End-to-end sanity (manual, post-merge): open a passage, select a word, click "Dịch" — popup should show only the word, its Vietnamese translation, the part-of-speech badge, and the save button. No IPA span, no speaker icon. Confirm `Translation` type still compiles in `content-panel.tsx` (it only reads `translation.translation` and `translation.partOfSpeech`).

## Risk
Low. The change is a removal, the schema contract narrows, and no caller reads IPA. Knip may flag the now-unused `Volume2` import — fixed by the import-line edit. No data migration (IPA was never persisted).