---
title: Studio Right Panel Layout Refactor
status: pending
created: 2026-05-06
updated: 2026-05-06
files:
  - src/app/(dashboard)/study/study-right-panel.tsx
  - src/app/(dashboard)/study/study-types.ts
  - src/app/(dashboard)/study/study-page-client.tsx
---

# Studio Right Panel Layout Refactor

## Problem
Current right panel uses full-panel takeover for Quiz/Summary. User wants:
- Keep current auto-fill grid for function action cards
- Streaming tasks shown **above** the results section
- A **"Results"** section (renamed from "History") that accumulates every generated page — both old and new

## Target Layout
```
┌─────────────────────────────┐
│ STUDIO                      │
├─────────────────────────────┤
│ [Quiz] [Summary] [Flash]    │  ← Keep current auto-fill grid
│ [Mind] [Translate]          │     (disabled cards unchanged)
├─────────────────────────────┤
│ RESULTS                     │
│ ⏳ Quiz: "Passage X"...     │  ← In-progress item (spinner)
│ 📝 Summary: "Passage Y" 1h │  ← Click → panel replacement
│ 📋 Quiz: "Passage Z"  2d   │
└─────────────────────────────┘
```

## Design Decisions
- **Layout**: Keep current auto-fill grid (`grid-cols-[repeat(auto-fill,minmax(100px,1fr))]`)
- **Theme**: Keep current light color scheme
- **Card click**: Insert a loading item at the TOP of Results section. On completion, item becomes clickable result.
- **Results section** (not "History"): Single list handles both in-progress (spinner) and completed items. Newest at top.
- **Results item click**: Panel replacement (Approach A) with back button
- **No separate streaming queue** — Results section itself shows in-progress items at top
- **Storage**: In-memory for now (DB later)

## Files to Modify
| File | Change |
|------|--------|
| `study-right-panel.tsx` | Major refactor — new layout, streaming, results |
| `study-types.ts` | Add streaming task + result item types |
| `study-page-client.tsx` | Wire up streaming/result callbacks to studio panel |

## Phases

### Phase 1: Types & Layout Foundation
- [ ] Rename `HistoryItem` → `ResultItem` in `study-types.ts`
- [ ] Add `ResultItem` type (id, type, passageTitle, completedAt, data snapshot)
- [ ] Keep current auto-fill grid — no layout change to action cards

### Phase 2: In-Progress Items in Results
- [ ] Card click → insert loading item at top of Results (spinner + title + subtitle)
- [ ] On completion: loading item transitions to completed result (remove spinner, make clickable)
- [ ] Max 3 concurrent in-progress items allowed

### Phase 3: Results Section
- [ ] Add results state (in-memory array, newest first)
- [ ] Render results list below streaming section
- [ ] Each item: icon + title + passage name + relative time
- [ ] Click result item → panel replacement with back button
- [ ] Reuse existing QuizContent/Summary views
- [ ] Section header: "Results" (not "History")

### Phase 4: Polish
- [ ] Empty states (no results, no active passage)
- [ ] Smooth transitions between default/result views
- [ ] Remove old "Quick generate" section
