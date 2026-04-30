# Main Study Page MVP — Implementation Plan

**Project:** Main Study Page MVP | **Linear:** ENG-5, ENG-6, ENG-7, ENG-8
**Created:** 2026-04-29 | **Status:** Planning

---

## Goal

Replace the multi-page flow (`/upload` → `/processing` → `/reading/[id]` → `/test/[id]`) with a single `/study` page featuring a split-panel layout: left panel for upload/reading, right panel for choice-answer test.

## Phases

| Phase | Issue | Title | Status | Dependencies |
|-------|-------|-------|--------|-------------|
| 01 | ENG-5 | Split-panel layout | Pending | None |
| 02 | ENG-6 | Left panel: upload + reading | Pending | Phase 01 |
| 03 | ENG-7 | Right panel: test | Pending | Phase 01 |
| 04 | ENG-8 | End-to-end integration | Pending | Phase 02, 03 |

## Key Decisions

1. **Single client component** manages shared state — no external state library (YAGNI)
2. **New server action** `studyAnalyzeAction` wraps existing pipeline + returns full data (passage + questions)
3. **Reuse existing components**: `UploadZone`, `TextInputArea` used directly; `ReadingViewClient` and `FlashcardTestClient` logic adapted into panel components
4. **File structure**: 5 new files under `src/app/(dashboard)/study/` — each under 200 lines
5. **Home page update**: Change "Upload Content" card to link to `/study` instead of `/upload`

## File Structure (New)

```
src/app/(dashboard)/study/
├── page.tsx                    # Server shell (~10 lines)
├── study-page-client.tsx       # Layout + state + orchestration (~150 lines)
├── study-left-panel.tsx        # Upload/Processing/Reading states (~180 lines)
├── study-right-panel.tsx       # Empty/Test/Complete states (~200 lines)
└── study-types.ts              # Shared types (~30 lines)
```

## Files to Modify

- `src/app/actions/analyze.ts` — Add `studyAnalyzeAction` that returns full passage + questions
- `src/app/page.tsx` — Update "Upload Content" link to `/study`

## Existing Components Reused (No Changes)

- `src/components/upload-zone.tsx` — Drag-drop file upload
- `src/components/text-input-area.tsx` — Text paste input
- `src/lib/upload-validator.ts` — File/text validation
- `src/lib/reading-utils.ts` — Reading time calculation
- `src/lib/cefr-utils.ts` — CEFR color/label helpers
- `src/lib/utils.ts` — cn() utility
