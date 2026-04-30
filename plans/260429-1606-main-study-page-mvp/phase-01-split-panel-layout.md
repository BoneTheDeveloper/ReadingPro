# Phase 01: Split-Panel Layout (ENG-5)

**Priority:** High | **Status:** Pending | **Dependencies:** None

---

## Context

- Linear: [ENG-5](https://linear.app/english-reading-app/issue/ENG-5/design-split-panel-layout-for-main-study-page)
- PDR: Design principles — typography-first, calm interface, minimal cognitive load
- Code standards: Server Components default, files under 200 lines, kebab-case

## Key Insights

- Existing pages each wrap content in `min-h-screen` with their own header — study page needs a shared header-less panel approach
- Tailwind CSS 4 with `lg:` breakpoint for responsive split
- shadcn/ui `base-nova` theme already configured in `globals.css`
- `cn()` utility from `@/lib/utils` for conditional class merging

## Requirements

- `/study` route renders a split-panel layout
- Desktop: side-by-side (left ~45%, right ~55%)
- Mobile: stacked vertically (left on top, right below)
- Each panel scrolls independently
- Minimal chrome — no full-page headers per panel

## Architecture

```
page.tsx (Server Component)
  └── study-page-client.tsx (Client Component)
        ├── Left Panel  (study-left-panel.tsx)
        └── Right Panel (study-right-panel.tsx)
```

State lives in `study-page-client.tsx`:
```typescript
type StudyStatus = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error';
interface StudyState {
  passage: PassageData | null;
  questions: QuestionData[];
  status: StudyStatus;
  error: string | null;
}
```

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/app/(dashboard)/study/page.tsx` | Server component shell | ~10 |
| `src/app/(dashboard)/study/study-page-client.tsx` | Layout + state management | ~150 |
| `src/app/(dashboard)/study/study-left-panel.tsx` | Left panel container (placeholder for now) | ~30 |
| `src/app/(dashboard)/study/study-right-panel.tsx` | Right panel container (placeholder for now) | ~30 |
| `src/app/(dashboard)/study/study-types.ts` | Shared TypeScript interfaces | ~30 |

## Files to Reference

- `src/app/layout.tsx` — Root layout (Geist fonts)
- `src/app/globals.css` — Tailwind + shadcn theme variables
- `src/lib/utils.ts` — cn() utility

## Implementation Steps

1. Create `study-types.ts` with `StudyState`, `PassageData`, `QuestionData`, `StudyStatus` types
2. Create `page.tsx` — thin server component that renders `StudyPageClient`
3. Create `study-page-client.tsx`:
   - Initialize `StudyState` with `useState`
   - Render split-panel layout using `lg:grid lg:grid-cols-[45%_1fr]`
   - Mobile: `flex flex-col` default
   - Each panel in a `div` with `overflow-y-auto` for independent scroll
   - Pass state + callbacks to child panels
4. Create `study-left-panel.tsx` — placeholder div showing "Upload area" text
5. Create `study-right-panel.tsx` — placeholder div showing "Test area" text
6. Update `src/app/page.tsx` — change "Upload Content" link from `/upload` to `/study`

## Todo Checklist

- [ x] Create `study-types.ts` with shared interfaces
- [ x] Create `page.tsx` server component shell
- [ x] Create `study-page-client.tsx` with split-panel layout + state
- [ x] Create `study-left-panel.tsx` placeholder
- [ x] Create `study-right-panel.tsx` placeholder
- [ x] Update home page link to `/study`
- [ x] Verify: `/study` renders split-panel on desktop, stacked on mobile
- [ x] Verify: each panel scrolls independently

## Success Criteria

- `/study` route renders without errors
- Desktop: two panels side by side
- Mobile: panels stacked vertically
- Independent scrolling works
- Home page "Upload Content" links to `/study`
