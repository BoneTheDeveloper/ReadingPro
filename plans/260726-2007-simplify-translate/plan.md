---
title: "Simplify Translate + Drop Dictionary"
description: "Step-by-step simplification of inline translate. Each phase is independently committable. Cleanup → placeholder UI → real provider → schema drop + Studio detail. Save toggle is owned by the separate vocabulary-save-toggle plan."
status: pending
priority: P1
effort: 2d
branch: preview
tags: [refactor, backend, frontend]
blockedBy: []
blocks: []
related: ["260726-2007-vocabulary-save-toggle"]
created: 2026-07-26
---

# Simplify Translate + Drop Dictionary

## Overview

Four incremental phases. Each ends in a fully-committable state where the dev server runs and `pnpm typecheck && pnpm lint && pnpm knip` are green.

| Phase | What | Result |
|---|---|---|
| **1** | [Dead-file cleanup](./phase-01-cleanup.md) | App compiles; no orphan modules; navigation has no `/dictionary`. |
| **2** | [Placeholder UI](./phase-02-placeholder-ui.md) | Popup renders with hardcoded data on selection; no fetch. |
| **3** | [Provider + Cache](./phase-03-provider-and-cache.md) | `POST /api/translate` returns real translations; LRU cache hits warm. |
| **5** | [Schema Drop + Studio Detail](./phase-05-schema-drop-and-studio-detail.md) | Seven DB tables gone; Studio Translation tab renders rich payload. |

> **Save Toggle (Phase 4)** lives in a separate plan: [260726-2007-vocabulary-save-toggle](../260726-2007-vocabulary-save-toggle/plan.md). Keeping translate and vocabulary-save concerns split prevents a single plan from implementing both. The vocabulary-save plan re-uses `useWordTranslator`'s hook surface.

## Architectural Decision: Route vs Server Action

**Decision: inline translate uses a Route (`POST /api/translate`). No Server Action for translate.**

Rationale (locked):
- The hook today already uses `fetch("/api/translate")` (`use-word-translation.ts:88`).
- Translate is a read-only RPC (no `revalidatePath`). Route is the more honest shape.
- Routes are testable via curl and reachable from non-React clients.
- Save remains a Server Action (see vocabulary-save-toggle plan) because save mutates `VocabularyItem` and needs `revalidatePath("/vocabulary")`.

## Non-Goals

- Fetching real IPA / POS from Google dictionary endpoint (placeholders only).
- Caching across server restarts or users.
- Switching to OpenAI/DeepL or any AI SDK.
- Adding phrase/compound dictionaries, synonym lists, or new vocabulary models.
- Save / toggle / delete vocabulary items — handled by vocabulary-save-toggle plan.

## Goals (this plan)

| # | Goal | Priority |
|---|------|----------|
| 1 | Inline translate uses `translate.googleapis.com/translate_a/single`; no DB on the request path | P1 |
| 2 | In-memory cache keyed by `normalize(text)`; ≤500 entries, 24h TTL | P1 |
| 3 | Word popup ≤300px wide; phrase popup ≤280px | P1 |
| 4 | Studio Translation tab renders rich payload via `?full=1` on the same route | P1 |
| 5 | Loading skeleton appears immediately on `mouseup` | P1 |
| 6 | Not-found / error surfaces "Không tìm thấy bản dịch" | P1 |
| 7 | Seven DB tables + dictionary route deleted | P1 |
| 8 | `pnpm typecheck && pnpm lint && pnpm knip` green | P1 |

## File Inventory (this plan)

Conventions:
- **Action**: `rewrite` (replace from scratch using original as reference) · `modify` · `delete` · `create`.
- Each phase owns the rows listed under it; cross-phase reuse of a file = the latter phase wins.
- Phases execute in order 1 → 2 → 3 → 5.

### Already broken before Phase 1

| File | Status | Note |
|---|---|---|
| `src/app/api/translate/route.ts` | Imports missing `executeTranslate` | The `services/inline-translate.ts` file is gone. Phase 1 owns a temporary placeholder rewrite; Phase 3 owns the real impl. |

### Phase 1 — Cleanup

| Action | Path | Reason |
|---|---|---|
| rewrite | `src/app/api/translate/route.ts` | Temporary: returns `{ translation: "placeholder" }` with HTTP 200 so the dev server compiles. Phase 3 replaces this. |
| rewrite | `src/features/reading/server/services/inline-translate.ts` | Temporary: exports `executeTranslate` returning `{ ok: true, data: { translation: "placeholder", type: null, provider: "fallback" } }`. Phase 3 replaces this. |
| delete | `src/features/reading/server/db/inline-translate.ts` | Dead glue; no consumers. |
| delete | `src/features/reading/server/db/translation.ts` | Dead glue; no consumers. |
| delete | `src/features/reading/lib/text-utils.ts` | Replaced: move `countWords` into `selection-utils.ts`; drop `TranslateResolutionSource` orphan. |
| modify | `src/features/reading/lib/selection-utils.ts` | Bring in `countWords` from the deleted file so callers compile. |
| delete | `src/app/(dashboard)/dictionary/**` | Already removed; remove any strays. |
| delete | `src/features/dictionary/**` | Already removed; remove any strays. |
| modify | navigation/rail | Remove `Từ điển` link; remove unused `Languages` icon import. |

### Phase 2 — Placeholder UI

| Action | Path | Reason |
|---|---|---|
| rewrite | `src/features/reading/schemas/translation.ts` | Add `TranslationSelection.kind: "word" \| "phrase"`; add `ipa: string \| null` and `pos: string \| null` to `TranslationDto`. |
| modify | `src/features/reading/lib/selection-utils.ts` | Add `kind` to returned `TranslationSelection`. |
| rewrite | `src/features/reading/hooks/use-word-translation.ts` | From scratch. Expose `selectionKind`. Returns placeholder data instead of fetching. Phase 3 replaces the body to call `/api/translate`. |
| rewrite | `src/features/reading/components/translation-popup.tsx` | From scratch. Branches on `kind === "word" \| "phrase"`. Loading skeleton, success state with placeholders, not-found message. Positioning math copied byte-for-byte from the original. |
| rewrite | `src/features/reading/hooks/use-content-state.ts` | From scratch. Composes the new translator + a no-op vocabulary hook. |
| rewrite | `src/features/reading/components/content-panel.tsx` | From scratch. Passes new props to `TranslationPopup`. No Studio tab yet — Phase 5. |

### Phase 3 — Provider + Cache

| Action | Path | Reason |
|---|---|---|
| create | `src/features/reading/server/lib/google-translate.ts` | Provider client: `translate.googleapis.com/translate_a/single`. |
| create | `src/features/reading/server/lib/translation-cache.ts` | LRU (≤500 entries, 24h TTL). |
| rewrite | `src/features/reading/server/services/inline-translate.ts` | From scratch. `cache.get → provider → cache.set`. |
| rewrite | `src/app/api/translate/route.ts` | From scratch. Zod parse, call `executeTranslate`, return `{ translation: null }` on 404. |

### Phase 5 — Schema Drop + Studio Detail

| Action | Path | Reason |
|---|---|---|
| rewrite | `prisma/schema.prisma` | From scratch. Drop the seven models, drop `VocabularySourceType.DICTIONARY`, drop `dictionaryEntryId` / `dictionarySenseId` columns. |
| modify | `src/features/vocabulary/schemas/vocabulary.ts` | Drop `dictionaryEntryId` / `dictionarySenseId` from schema. |
| rewrite | `src/features/vocabulary/server/services/vocabulary-items.ts` | From scratch. Drop dictionary fields. |
| modify | `src/features/vocabulary/server/db/vocabulary-items.ts` | Drop dictionary fields. |
| delete | `prisma/seed.ts` | No consumers after dictionary removal. |
| delete | `prisma/data/dictionary/**` | Seed JSON for dropped tables. |
| modify | `package.json` | Drop `db:seed:dictionary` script if present. |
| create | `prisma/migrations/<timestamp>_drop_dictionary_and_translation_tables/migration.sql` | One SQL file: `UPDATE SET NULL` first, drop columns, drop seven tables. |
| create | `src/features/reading/server/services/full-translation.ts` | Returns word payload (meanings) or phrase payload. |
| create | `src/features/reading/hooks/use-translation-selection.ts` | `translationKind(text)` helper. |
| create | `src/features/reading/hooks/use-full-translation.ts` | Hook calls `fetch('/api/translate?full=1', …)`. |
| create | `src/features/reading/components/translation-detail-card.tsx` | Studio panel render. |
| modify | `src/app/api/translate/route.ts` | Add `?full=1` branch (calls `getFullTranslation`). |
| modify | `src/features/reading/components/content-panel.tsx` | Add Studio Translation tab. |

## Whole-plan invariants

- `useContentState` is the single hook composition seam. `content-panel.tsx` reads from it.
- `useWordTranslator` keeps the export shape `{ selectedWordInfo, translationState, handleWordSelection, translateWord, selectionKind }`.
- The pop-up picks the layout by `selectionKind === "word" ? wordLayout : phraseLayout`.
- `useContentState` API stays compatible across all phases; no consumer refactor needed.
- Save-side fields (`saved`, `toggleSave`, `handleSaveVocabulary`) come from `useVocabulary` defined in the **vocabulary-save-toggle plan** — Phase 2 only provides a no-op stub returning `{ saved: false, toggleSave: () => {}, isVocabularySaved: false, handleSaveVocabulary: async () => {} }`. Plan handoff is by file replacement, not duplicate implementation.

## Success Criteria

- [ ] After Phase 1: dev server compiles, no orphan references; navigating to `/dictionary` returns 404.
- [ ] After Phase 2: selecting a word shows the popup with placeholder text + skeleton → no fetch, no errors.
- [ ] After Phase 3: `POST /api/translate` returns real translations; second identical request hits cache.
- [ ] After Phase 5: migration drops the seven tables + two columns; Chi tiết renders the rich payload in the Studio tab.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` green after every phase.

## Risks

- **Phase 2 UI drift** — placeholder popup must look credible so designers can sign off before Phase 3 is built. Set explicit per-phase review gate.
- **Provider contract drift** — `translate.googleapis.com` is undocumented and may change. Wrap parsing; render "Not found" on null.
- **Phase 5 migration** — `dictionaryEntryId` rows must be `SET NULL` before column drop. Idempotent on clean DB.
- **Plan split coordination** — `useContentState` consumes both plans' outputs. Phase 2 ships the no-op vocabulary surface; the vocabulary-save-toggle plan replaces it later. If cooked in the wrong order, popup Save button does nothing until the save plan lands.

## Open Questions

- Final IPA / POS source: `/translate_a/dict` endpoint or remain placeholder? Deferred.
- Studio tab persistence across passage switches: closed on switch, reopen via Chi tiết click.

<!-- slug: simplify-translate -->