# Brainstorm: Resizable Study Panels with Draggable Gaps

**Date:** 2026-05-06
**Status:** APPROVED — plan created at `plans/260506-resizable-study-panels/`
**Scope:** Study page three-panel layout — add gaps + drag-to-resize

## Problem Statement

Current study page uses fixed-width side panels (left 220px, right 260px) with inline 8px margins on the center panel. Panels are flush/sticky with no visual separation. Users cannot resize panels to adjust reading/workspace proportions.

## Requirements

1. 10px draggable gaps between each panel
2. Left panel resizable from right edge
3. Right panel resizable from left edge
4. Center panel resizable horizontally (fill remaining space)
5. Panel widths persist across sessions (localStorage)
6. Min width per panel = smallest side panel width (220px)
7. Max width per panel = center panel typical width (~remaining space)

## Current Layout Analysis

```
study-page-client.tsx:144
├── Outer div: flex, h-[calc(100dvh-4rem)], padding 4rem 8px 8px 8px
├── StudySourcesPanel (left): width: 220px, shrink-0, borderRadius 12px
├── Center main: flex-1, margin 0 8px, borderRadius 12px
└── StudyStudioPanel (right): width: 260px, shrink-0, borderRadius 12px
```

Fixed widths set via inline `style={{ width: '220px' }}` and `style={{ width: '260px' }}` on left/right panel root divs.

## Approaches Evaluated

### A. react-resizable-panels (CHOSEN)
- ~12KB gzipped, zero deps, 34.5M weekly downloads
- Built-in: accessibility (keyboard, ARIA), localStorage persistence via `autoSaveId`, min/max constraints
- Headless — full Tailwind styling control
- 30 min implementation

### B. react-split-pane v3
- ~3KB gzipped, newer v3 API still stabilizing
- No collapsible panels, smaller community
- Less Tailwind-friendly

### C. Custom pointer events
- 0KB bundle but 2-5 days work
- Must build: touch support, keyboard accessibility, persistence, edge cases
- High maintenance burden

## Recommended Solution: Approach A

### Library
`react-resizable-panels` v4 — install via npm.

### Layout Structure

```
┌──────────────┬────────────┬────────────────────────┬────────────┬───────────────┐
│  Left Panel  │  10px gap  │    Center Panel        │  10px gap  │  Right Panel  │
│  Sources     │  drag ◀▶  │    Content             │  drag ◀▶  │  Studio       │
│  def: 22%    │  Separator │    def: 52%            │  Separator │  def: 26%     │
│  min: 220px  │            │    min: 220px          │            │  min: 220px   │
│  max: 70%    │            │                        │            │  max: 70%     │
└──────────────┴────────────┴────────────────────────┴────────────┴───────────────┘
```

### Panel Size Config

| Panel | Default | Min | Max |
|-------|---------|-----|-----|
| Left (Sources) | 22% | 220px | 70% |
| Center (Content) | 52% (auto-fill) | 220px | — |
| Right (Studio) | 26% | 220px | 70% |

Default percentages calculated from current pixel widths relative to ~1000px viewport:
- 220/1000 ≈ 22%
- 260/1000 ≈ 26%
- Center ≈ 52%

### Separator (Drag Gap) Design

- 10px wide, full panel height
- Entire gap area is draggable (cursor: col-resize)
- Visual indicator: subtle centered line (1px, border color) that highlights on hover/drag
- Rounded panel corners preserved (borderRadius: 12px on panels)

### Persistence

```tsx
<Group autoSaveId="study-panels" ...>
```

One prop saves all panel sizes to localStorage automatically.

### Files to Modify

1. **`study-page-client.tsx`** — Replace flex container with `<Group>/<Panel>/<Separator>` layout
2. **`study-left-panel.tsx`** — Remove fixed `width: 220px` inline style (Panel controls width)
3. **`study-right-panel.tsx`** — Remove fixed `width: 260px` inline style from all 3 render paths
4. **`package.json`** — Add `react-resizable-panels` dependency

### Files NOT Modified

- `study-content-panel.tsx` — no width logic
- `study-types.ts` — no type changes needed
- `study-quiz-content.tsx` — no layout changes
- `study-upload-modal.tsx` — no changes

### Implementation Steps

1. Install `react-resizable-panels`
2. Update `study-page-client.tsx`: wrap panels in Group/Panel/Separator
3. Remove fixed width from left panel root div
4. Remove fixed width from right panel root div (3 places: quiz view, summary view, default view)
5. Style separators with Tailwind for 10px gap + visual handle
6. Test resize behavior + localStorage persistence

### Risks

- **Percentage vs pixel sizing:** react-resizable-panels uses % internally. Default sizes must be percentages. Min sizes can be px. Behavior should feel identical since panels resize proportionally.
- **Border radius overlap:** 12px border-radius on panels with 10px gaps may clip. Verify visually.
- **Right panel 3 render paths:** Each return in `study-right-panel.tsx` has its own root div with `width: 260px`. All 3 must be updated.

## Success Criteria

- [ ] Panels separated by 10px visible gaps
- [ ] Drag any gap to resize adjacent panels
- [ ] Panels constrained to min 220px
- [ ] Panel widths persist across page reloads
- [ ] Existing functionality preserved: upload, simplify, quiz, document selection
- [ ] TypeScript compiles without errors
- [ ] No layout shift or flicker on initial load

## Unresolved Questions

- None at this time.
