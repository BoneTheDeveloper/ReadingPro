---
title: Plan dictionary translation panel
date: 2026-11-22
summary: "Planned dictionary-backed Studio translation with Pro-only inline popup, ahead of billing"
---

# Plan dictionary translation panel

## What happened
Brainstormed Free/Pro tiers and SePay QR billing (plans/reports/brainstorm-261122-1433-sepay-pro-tier-billing.md), then planned the translation rework first because it drives the tier split: plans/261122-0751-dictionary-translation-panel/.

While scouting, found that `src/server/modules/translate/translate-routes.ts` has no `requireSession`, so anyone can call the gpt-4o-mini translate endpoint.

## Decision
- Common meanings come from the Hồ Ngọc Đức / OVDP English-Vietnamese dictionary imported into Postgres (`DictionaryEntry`), with no AI call. Lemmas resolve via wink-lemmatizer candidates.
- Text selection stays. The **Dịch** button opens a **Tra từ** view in Studio (a new tile). Each found lookup is stored as a `WordLookup` row per passage.
- External translators (Google Dịch, Cambridge, Oxford, DeepL) open in a popup window.
- The in-place popup and the AI context meaning are Pro-only. `/api/translate` gets session and Pro guards.
- Saved-word highlighting is out of scope.

## Next steps
Run `/ak:cook plans/261122-0751-dictionary-translation-panel/plan.md`. Phase 1 must verify the dataset license and its real format first. The billing plan follows.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
