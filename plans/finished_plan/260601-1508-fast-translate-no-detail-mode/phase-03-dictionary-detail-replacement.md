---
phase: 3
title: "Dictionary Detail Replacement"
status: pending
priority: P2
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Dictionary Detail Replacement

## Overview

Replace detailed translation with dictionary lookup/search for selected words and short phrases. This keeps extra learner context fast, deterministic, and non-AI.

## Requirements

- Functional: Selected word or phrase can open dictionary detail/search.
- Functional: If exact dictionary lookup misses, dictionary suggest/search should still show useful nearby entries.
- Functional: Sentence or paragraph machine translations do not open fake dictionary detail.
- Non-functional: Dictionary detail should not block the fast translation popup.

## Architecture

For dictionary-scope selections, the UI can call `GET /api/dictionary` first and fall back to `GET /api/dictionary/suggest`. For machine-scope selections, the detail action should be hidden or replaced with dictionary search for the most relevant selected token only if that behavior is explicit.

## Related Code Files

- Modify: `src/features/study/study-translation-popup.tsx`
- Modify: `src/features/study/study-right-panel.tsx`
- Reuse: `src/app/api/dictionary/route.ts`
- Reuse: `src/app/api/dictionary/suggest/route.ts`
- Reuse/Modify: `src/features/dictionary/*`

## Implementation Steps

1. Define selection scope for dictionary detail in the client.
2. Add an Open Dictionary action for dictionary-scope translations.
3. Reuse dictionary lookup/search components or extract a compact dictionary detail component.
4. Show a useful miss state with suggestions when exact lookup misses.
5. Hide detail action for long selections unless product explicitly wants token-based lookup.

## Success Criteria

- [ ] Word and short phrase selections can open dictionary detail/search.
- [ ] Dictionary detail uses `/api/dictionary` or `/api/dictionary/suggest`, not `/api/translate`.
- [ ] Long sentence/paragraph translations do not trigger detailed AI replacement work.
- [ ] Dictionary miss state is understandable and does not look like a failed translation.

## Risk Assessment

Risk: Dictionary coverage is still limited, so detail may look empty often.
Mitigation: Fall back to suggest search and keep the fast translation visible as the primary result.
