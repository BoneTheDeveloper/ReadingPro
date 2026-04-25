# UI/UX Design Report

**English Reading Training App**
**Date:** 2026-04-20

---

## Summary

Complete design system and interactive wireframes delivered for the English Reading Training App. All screens feature a typography-first, calm learning experience with blue/indigo color palette.

---

## Deliverables

### 1. Design Guidelines (`./docs/design-guidelines.md`)

Complete design system documentation including:

**Color System:**
- Primary: Indigo (#4f46e5 - #6366f1) for learning focus
- Secondary: Blue (#2563eb - #3b82f6) for information
- CEFR Level coding: Green (A1) → Yellow (B1) → Orange (B2) → Pink (C1) → Purple (C2)
- WCAG 2.1 AA compliant contrast ratios

**Typography:**
- Primary: Inter (UI elements, Vietnamese support)
- Reading: Literata (long-form content, optimized for extended reading)
- Type scale: 12px - 36px with 1.5-1.8 line height for readability

**Layout & Spacing:**
- 4px base unit system
- 70ch max width for reading content
- Mobile-first responsive breakpoints (320px, 640px, 768px, 1024px)

**Component Patterns:**
- Buttons, cards, inputs, progress bars
- Flashcard flip animations
- Loading states with skeleton patterns

---

### 2. Interactive Wireframes (`./docs/wireframe/`)

| Screen | File | Key Features |
|--------|------|--------------|
| Landing/Upload | `landing-upload.html` | Drag-drop zone, input method cards, recent uploads list |
| Processing View | `processing-view.html` | Circular progress, step-by-step status, calming animations |
| Study View | `study-view.html` | Typography-focused reading, word highlights, sidebar/bottom sheet for definitions |
| Flashcard View | `flashcard-view.html` | Card flip animation, spaced repetition ratings (Again/Hard/Good/Easy) |
| Dashboard | `dashboard-view.html` | Progress stats, streak counter, CEFR level track, achievements grid |

---

## Design Decisions

### Typography-First Reading Experience
- Literata font for 18px/1.8 reading content reduces eye strain
- 70ch max line length (optimal for comprehension)
- Highlighted vocabulary with subtle background gradients

### Calm, Focused Interface
- Blue/indigo palette promotes concentration
- Minimal chrome, maximum content visibility
- No distracting patterns or aggressive colors

### Mobile-Responsive Design
- All screens tested 320px - 1280px
- Touch targets minimum 44x44px
- Bottom sheets for mobile word definitions
- Sidebar for desktop definitions

### Spaced Repetition Flashcards
- SM-2 algorithm visualization via ratings
- Source context displayed with each card
- Keyboard shortcuts (1-4, spacebar)

---

## Technical Notes

- Pure HTML/CSS/JS (no build required)
- CSS custom properties for theming
- Smooth 200ms transitions (respects prefers-reduced-motion)
- Google Fonts: Inter + Literata (Vietnamese character support)

---

## File Structure

```
D:\Project\English_Reading_Training_App\
├── docs/
│   ├── design-guidelines.md          # Design system
│   └── wireframe/
│       ├── landing-upload.html       # Upload page
│       ├── processing-view.html      # AI processing status
│       ├── study-view.html           # Reading interface
│       ├── flashcard-view.html       # Card review
│       └── dashboard-view.html       # Progress dashboard
```

---

## Unresolved Questions

1. Should the reading view support custom font sizes beyond small/medium/large presets?
2. Exact placement and size of CEFR level badge within reading content
3. Whether to add a "dark mode" toggle at launch (colors prepared but UI not implemented)

---

**Status:** DONE
