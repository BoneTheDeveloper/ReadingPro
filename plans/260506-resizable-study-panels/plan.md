---
title: "Resizable Study Panels with Draggable Gaps"
description: "Replace fixed-width panel layout with react-resizable-panels for 10px draggable gaps between left/center/right panels, with min/max constraints and localStorage persistence"
status: completed
priority: P2
effort: 1.5h
branch: main
tags: [study-page, layout, resize, panels]
created: 2026-05-06
completed: 2026-05-06
blockedBy: []
blocks: []
---

## Overview

Replace the current fixed-width three-panel layout (left 220px / center flex / right 260px) with `react-resizable-panels` v4. Panels separated by 10px draggable gaps. Widths persist to localStorage.

## Brainstorm Reference

`plans/reports/brainstorm-260506-resizable-study-panels.md`

## Phases

| # | Phase | Status | File Ownership |
|---|-------|--------|----------------|
| 1 | [Install dependency](./phase-01-install-dependency.md) | ✅ completed | `package.json` |
| 2 | [Rewire client with Group/Panel/Separator](./phase-02-rewire-client-layout.md) | ✅ completed | `study-page-client.tsx` |
| 3 | [Remove fixed widths from side panels](./phase-03-remove-fixed-widths.md) | ✅ completed | `study-left-panel.tsx`, `study-right-panel.tsx` |
| 4 | [Style separators + verify](./phase-04-style-separators.md) | ✅ completed | `study-page-client.tsx` (separator styles) |

## Dependencies

```
Phase 1 (install) ──► Phase 2 (rewire client) ──► Phase 3 (remove fixed widths) ──► Phase 4 (style + verify)
```

Strictly sequential. Each phase depends on the previous.

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Library | react-resizable-panels v4 | 12KB gzip, 0 deps, built-in persistence + a11y |
| API components | `Group`, `Panel`, `Separator` | v4 renamed API (was PanelGroup/Panel/PanelResizeHandle) |
| Persistence | `useDefaultLayout` hook | Saves layout to localStorage on drag end, restores on load |
| Size units | Percentage defaults, pixel mins | v4 supports mixed units: `defaultSize="22%"` + `minSize={220}` |
| Gap width | 10px on Separator | Entire gap is draggable (cursor: col-resize) |
| Visual handle | Centered 1px line in gap | Highlights on hover/drag via `data-separator` attributes |

## Panel Size Config

| Panel | ID | Default | Min | Max |
|-------|----|---------|-----|-----|
| Left (Sources) | `sources` | 22% | 220px | 70% |
| Center (Content) | `content` | 52% (auto) | 220px | — |
| Right (Studio) | `studio` | 26% | 220px | 70% |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| v4 API name mismatch with docs | Low | Low | Verified API from context7: Group/Panel/Separator |
| Right panel 3 render paths need updating | Medium | Low | All 3 root divs identified at lines 58, 78, 111 |
| Panel border-radius clips into gap | Low | Low | 12px radius + 10px gap = 2px clearance, verify visually |
| SSR hydration mismatch on persisted layout | Low | Medium | `useDefaultLayout` reads localStorage client-side only |

## Rollback Plan

4 files touched. Revert all to restore fixed-width layout. Uninstall dependency.

## Success Criteria

- [x] 10px draggable gaps between all 3 panels
- [x] Drag any gap to resize adjacent panels
- [x] Panels cannot shrink below 220px
- [x] Panel widths persist across page reloads
- [x] All existing functionality preserved: upload, simplify, quiz, doc selection
- [x] `npx tsc --noEmit` passes
- [x] No layout flicker on initial load

## Additional Fixes (Review/Test)

- SSR safety: safe localStorage accessor with `typeof window` check
- Right panel default view: removed missed `width: '260px'`
- Separator: added `group` class for `group-data-*` selectors
- Group: added `id="study-panels"` for debugging
- `page.tsx`: added `export const dynamic = 'force-dynamic'` to prevent SSR crash
