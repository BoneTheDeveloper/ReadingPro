# Design Guidelines

**English Reading Training App**

---

## Design Philosophy

**Calm, editorial, reading-first study experience.**

The UI should prioritize reading, comprehension, and long-session usability over flashy visuals or aggressive SaaS aesthetics. Every element serves the learning goal.

The product should feel:
- Calm
- Focused
- Intelligent
- Editorial
- Premium
- Study-oriented

Inspired by: Linear, Readwise, Notion, Arc Browser, modern editorial applications.

---

## Core Principles

### 1. Content First

The primary focus of the interface is always the content. UI chrome should never overpower the reading experience.

Hierarchy priority:
1. Content
2. Active actions
3. Navigation
4. Secondary utilities

### 2. Calm Interfaces

Avoid:
- Excessive gradients
- Neon colors
- Heavy shadows
- Over-animation
- Visual clutter

Prefer:
- Warm neutrals
- Soft elevation
- Subtle transitions
- Clear spacing
- Controlled accents

### 3. Semantic Color Usage

Accent colors must communicate meaning. Do not use the same accent color everywhere.

| Color   | Meaning                               |
| ------- | ------------------------------------- |
| Navy    | Primary actions / authority           |
| Gold    | Study momentum / reviews / highlights |
| Green   | Success / completion                  |
| Red     | Errors / destructive actions          |
| Neutral | Passive UI                            |

---

## Color System

### Base Colors

```css
--background: #F6F4EE;
--surface: #FFFDF8;
--surface-elevated: #FFFFFF;
--border: #E7E0D4;
```

### Primary Colors (Navy - Authority & Focus)

```css
--primary: #1D3557;
--primary-hover: #274C77;
--primary-active: #14243D;
```

### Accent Colors (Gold - Study & Highlights)

```css
--accent-gold: #D4A373;
--accent-gold-soft: #FAEDCD;
```

### Success Colors

```css
--success: #588157;
--success-soft: #DDE5D8;
```

### Danger Colors

```css
--danger: #C8553D;
--danger-soft: #F9E0DA;
```

### Typography Colors

```css
--text-primary: #111827;
--text-secondary: #4B5563;
--text-muted: #9CA3AF;
```

### Neutral Palette (Reading Content)

```css
--neutral-0: #ffffff;
--neutral-50: #fafafa;
--neutral-100: #f5f5f5;
--neutral-200: #e5e5e5;
--neutral-300: #d4d4d4;
--neutral-400: #a3a3a3;
--neutral-500: #737373;
--neutral-600: #525252;
--neutral-700: #404040;
--neutral-800: #262626;
--neutral-900: #171717;
--neutral-950: #0a0a0a;
```

### CEFR Color Coding (Reading Levels)

```css
--cefr-a1: #86efac;  /* Green - Beginner */
--cefr-a2: #a3e635;
--cefr-b1: #fde047;  /* Yellow - Elementary */
--cefr-b2: #fbbf24;  /* Orange - Intermediate */
--cefr-c1: #f472b6;  /* Pink - Advanced */
--cefr-c2: #a78bfa;  /* Purple - Mastery */
```

---

## Typography System

### Typography Philosophy

Typography should feel editorial, clean, highly readable, and calm. Avoid dense text blocks, tiny font sizes, and excessively bold UI.

### Font Families

**Primary:** Inter (Google Fonts)
- Excellent readability at all sizes
- Vietnamese character support
- Optimized for UI elements and body text

**Reading:** Literata (Google Fonts)
- Designed for extended reading
- Vietnamese character support
- Used for: Long-form content, study passages

**Code/Monospace:** JetBrains Mono
- Clear, modern monospace
- Used for: Technical terms, code snippets

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-serif: 'Literata', Georgia, serif;
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

### Font Sizes

| Role           | Size | Weight |
| -------------- | ---- | ------ |
| Hero title     | 48px | 700    |
| Section title  | 32px | 700    |
| Card title     | 20px | 600    |
| Body           | 16px | 400    |
| Secondary text | 14px | 500    |
| Caption        | 12px | 500    |

### Reading Content Typography

```css
.reading-content {
  font-family: var(--font-serif);
  font-size: 1.125rem (18px);
  line-height: 1.8;
  letter-spacing: 0.01em;
  max-width: 70ch;
}
```

---

## Spacing System

8px base unit. Avoid arbitrary spacing values.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px  | Tight spacing    |
| `space-2` | 8px  | Small gaps       |
| `space-3` | 12px | Compact padding  |
| `space-4` | 16px | Default padding  |
| `space-6` | 24px | Section spacing  |
| `space-8` | 32px | Large sections   |
| `space-10` | 40px | Major divisions |
| `space-12` | 48px | Page margins    |
| `space-16` | 64px | Hero spacing    |

---

## Border Radius

Cards should feel soft but structured. Avoid sharp corners.

```css
--radius-sm: 10px;
--radius-md: 16px;
--radius-lg: 24px;
--radius-xl: 32px;
--radius-full: 9999px;  /* Pills, avatars */
```

---

## Shadows & Elevation

Use subtle elevation only. Avoid heavy shadows.

```css
--shadow-sm:
  0 1px 2px rgba(0,0,0,0.04),
  0 4px 12px rgba(0,0,0,0.03);
--shadow-md:
  0 1px 3px rgba(0,0,0,0.06),
  0 6px 16px rgba(0,0,0,0.04);
--shadow-lg:
  0 4px 6px rgba(0,0,0,0.04),
  0 10px 24px rgba(0,0,0,0.06);
```

---

## Layout Principles

### Dashboard Layout

- Left sidebar → navigation
- Main content → primary focus
- Right utilities → contextual tools

Content width should remain readable. Avoid ultra-wide reading layouts.

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-reading: 70ch;
```

### Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

Mobile-First Approach:
- Default styles: 320px - 639px
- sm: 640px+
- md: 768px+
- lg: 1024px+

---

## Component Patterns

### Cards

Cards should have breathing room, subtle borders, warm surfaces, and avoid noisy backgrounds. Hover states should feel responsive but restrained.

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.card-hoverable:hover {
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
}
```

### Buttons

**Primary Buttons** — Navy backgrounds. Used for main CTA, confirmation actions, important workflow steps.

**Secondary Buttons** — Subtle surfaces with borders.

**Ghost Buttons** — Only for tertiary actions.

```css
/* Primary Action */
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

/* Secondary Action */
.btn-secondary {
  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
```

### Input Fields

```css
.input {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: border-color 180ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}
```

### Progress Indicators

```css
.progress-bar {
  background: var(--border);
  border-radius: var(--radius-full);
  height: 8px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, var(--primary), var(--accent-gold));
  height: 100%;
  transition: width 300ms ease;
}
```

### Form Validation States

```css
/* Success */
.input-success { border-color: var(--success); }
/* Error */
.input-error { border-color: var(--danger); }
```

---

## Motion

Motion should feel fast, soft, and intentional.

Avoid: bouncy animations, large-scale motion, distracting transitions.

### Standard Transition

```css
transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Durations

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

### Easing

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

Honors `prefers-reduced-motion`.

---

## Reading Experience

The reading experience is the heart of the product.

Requirements:
- Comfortable line width
- Strong paragraph rhythm
- Generous whitespace
- Minimal distractions
- Clear hierarchy

Avoid: extremely long text lines, dense layouts, excessive UI around content.

---

## Empty States

Every empty state should contain:
- A clear title
- A short explanation
- A CTA

Empty states should guide the user, explain the next step, reduce confusion, and feel intentional.

---

## Interaction States

Every interactive component must have:
- Hover state
- Active state
- Focus state
- Disabled state

Never rely only on color changes.

---

## Loading States

### Skeleton Loading

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--neutral-200) 0%,
    var(--neutral-100) 50%,
    var(--neutral-200) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}
```

---

## Accessibility

Maintain:
- Strong text contrast (WCAG 2.1 AA: 4.5:1 minimum for normal text)
- Readable font sizes
- Keyboard accessibility
- Clear focus indicators (2px solid primary)
- Minimum touch target: 40x40px (mobile), recommended 48x48px
- Screen reader support with proper ARIA labels
- Semantic HTML structure

---

## Dark Mode

### Color Mapping

```css
.dark {
  --background: #111827;
  --surface: #1F2937;
  --surface-elevated: #374151;
  --border: #4B5563;
  --text-primary: #F9FAFB;
  --text-secondary: #D1D5DB;
  --text-muted: #6B7280;
}
```

Implementation:
- Uses CSS custom properties for easy theming
- Respects `prefers-color-scheme`
- Manual toggle in user settings

---

## Icon System

**Library:** Lucide Icons (via shadcn/ui)

**Key Icons:**
- `upload`: File upload
- `file-text`: Text/PDF input
- `youtube`: YouTube input
- `book-open`: Reading view
- `check-circle`: Success/Complete
- `flame`: Streak
- `trophy`: Achievement
- `bar-chart-3`: Progress

---

## Voice & Tone

**App Voice:** Encouraging, clear, supportive

**Microcopy Examples:**
- "Great progress! Keep it up." (Success)
- "Almost there! One more step." (Progress)
- "Let's analyze your text..." (Processing)
- "Ready to learn something new?" (Welcome)

---

## Reading Comprehension Test Pattern

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Progress Bar                          │
├──────────────────────┬──────────────────────────────────────┤
│   Reading Passage    │         Question Panel                │
│   (Always Visible)   │                                      │
│                      │  ┌─────────────────────────────────┐ │
│  ┌────────────────┐  │  │ Question #1              [Type] │ │
│  │   Passage      │  │  └─────────────────────────────────┘ │
│  │   Content      │  │  ┌─────────────────────────────────┐ │
│  │   with         │  │  │ ○ Option A                       │ │
│  │   numbered     │  │  │ ○ Option B                       │ │
│  │   lines        │  │  │ ○ Option C                       │ │
│  │                │  │  │ ○ Option D                       │ │
│  └────────────────┘  │  └─────────────────────────────────┘ │
│   Scrollable         │  [Review Passage] [Next Question]   │
└──────────────────────┴──────────────────────────────────────┘

Mobile: Stacked (Passage top, Question bottom)
Desktop: Side-by-side (Passage left, Question right)
```

### Component Specifications

#### Passage Panel

```css
.passage-panel {
  background: var(--surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}

.passage-content {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  line-height: 1.8;
  max-height: 500px;
  overflow-y: auto;
}

.line-number {
  position: absolute;
  left: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.highlight-source {
  background: linear-gradient(120deg, var(--accent-gold-soft), var(--surface));
  border-radius: var(--radius-sm);
  padding: 2px 4px;
}
```

#### Question Panel

```css
.option-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.option-label.selected {
  border-color: var(--primary);
  background: var(--surface);
}

.option-label.correct {
  border-color: var(--success);
  background: var(--success-soft);
}

.option-label.incorrect {
  border-color: var(--danger);
  background: var(--danger-soft);
}
```

#### Feedback States

```css
.feedback.correct {
  background: var(--success-soft);
  border: 1px solid var(--success);
}

.feedback.incorrect {
  background: var(--danger-soft);
  border: 1px solid var(--danger);
}

.feedback-source {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--accent-gold);
}
```

### Interaction Flow

1. **Initial State**: Question displayed, options enabled
2. **Select Option**: Highlight selected, enable "Check Answer"
3. **Check Answer**: Disable options, show correct/incorrect states, display feedback, highlight source in passage
4. **After Answer**: Show "Review Passage" and "Next Question" buttons
5. **Completion**: Show results summary with score

---

## Design Goals

We are building:
- A premium study experience
- A calm AI workspace
- A reading-first product
- A focused productivity tool

We are NOT building:
- A crypto dashboard
- A gaming UI
- A neon SaaS interface
- A visually noisy application

---

**Status:** Active
**Last Updated:** 2026-05-20
