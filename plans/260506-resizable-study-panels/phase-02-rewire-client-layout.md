# Phase 2: Rewire Client Layout with Group/Panel/Separator

## Context
- Plan: `plans/260506-resizable-study-panels/plan.md`
- Current file: `src/app/(dashboard)/study/study-page-client.tsx`
- Depends on: Phase 1 (package installed)

## Overview
Replace the current flex-based three-panel container with `react-resizable-panels` v4 components. Add `useDefaultLayout` hook for localStorage persistence.

## Current Layout (lines 143-180)
```tsx
<div className="pt-16 flex flex-1 h-[calc(100dvh-4rem)] overflow-hidden" style={{ background: '#EFEFED', padding: '4rem 8px 8px 8px' }}>
  <StudySourcesPanel ... />
  <main className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden" style={{ borderRadius: '12px', margin: '0 8px' }}>
    <div className="p-4 border-b" style={{ borderColor: '#E0DFD9' }}>
      <h2>Content</h2>
    </div>
    <StudyContentPanel ... />
  </main>
  <StudyStudioPanel ... />
</div>
```

## Target Layout
```tsx
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

// Inside component:
const { defaultLayout, onLayoutChanged } = useDefaultLayout({
  id: "study-panels",
  storage: localStorage,
});

<div className="pt-16 flex flex-1 h-[calc(100dvh-4rem)] overflow-hidden" style={{ background: '#EFEFED', padding: '4rem 8px 8px 8px' }}>
  <Group
    orientation="horizontal"
    defaultLayout={defaultLayout}
    onLayoutChanged={onLayoutChanged}
    className="flex flex-1 h-full"
  >
    <Panel id="sources" defaultSize="22%" minSize={220} maxSize="70%">
      <StudySourcesPanel ... />
    </Panel>

    <Separator className="w-[10px] flex items-center justify-center cursor-col-resize group" />

    <Panel id="content" minSize={220}>
      <div className="h-full bg-white flex flex-col overflow-hidden rounded-xl">
        <div className="p-4 border-b" style={{ borderColor: '#E0DFD9' }}>
          <h2>Content</h2>
        </div>
        <StudyContentPanel ... />
      </div>
    </Panel>

    <Separator className="w-[10px] flex items-center justify-center cursor-col-resize group" />

    <Panel id="studio" defaultSize="26%" minSize={220} maxSize="70%">
      <StudyStudioPanel ... />
    </Panel>
  </Group>
</div>
```

## Key Changes
1. Import `Group`, `Panel`, `Separator`, `useDefaultLayout` from `react-resizable-panels`
2. Add `useDefaultLayout` hook call at component top
3. Wrap entire panel area in `<Group orientation="horizontal">`
4. Wrap each panel in `<Panel>` with size constraints
5. Replace inline `margin: '0 8px'` on center panel with `<Separator>` gaps
6. Move `bg-white rounded-xl` styling to inner div inside Panel (Panel div is managed by library)

## Important Notes
- Panel component controls the outer div — existing panel components should NOT set width on their root
- `defaultLayout` from `useDefaultLayout` overrides `defaultSize` when saved layout exists in localStorage
- Center panel has no `defaultSize` — it fills remaining space
- The `main` tag must be changed to `div` since it's now inside a Panel (semantics handled by Panel)

## Files Modified
- `src/app/(dashboard)/study/study-page-client.tsx`

## Verification
- `npx tsc --noEmit` compiles
- Three panels render with gaps between them
- Dragging gaps resizes panels

## Status: ✅ Completed

## Success Criteria
- [x] Group/Panel/Separator wraps all three panels
- [x] useDefaultLayout hook configured
- [x] Size constraints applied (min 220px, max 70%)
- [x] Center panel has rounded corners and white background
- [x] TypeScript compiles without errors
