# Design Guidelines

**English Reading Training App**

---

## Design Philosophy

**Typography-first, calm, focused learning experience.**

The design prioritizes readability and reduces cognitive load, allowing users to focus entirely on their reading material. Every element serves the learning goal.

---

## Color System

### Primary Palette (Blue/Indigo - Learning & Focus)

```css
/* Primary - Brand Indigo */
--primary-50: #eef2ff;
--primary-100: #e0e7ff;
--primary-200: #c7d2fe;
--primary-300: #a5b4fc;
--primary-400: #818cf8;
--primary-500: #6366f1;  /* Main brand */
--primary-600: #4f46e5;  /* Primary actions */
--primary-700: #4338ca;  /* Pressed states */
--primary-800: #3730a3;
--primary-900: #312e81;

/* Secondary - Calm Blue */
--secondary-50: #eff6ff;
--secondary-100: #dbeafe;
--secondary-200: #bfdbfe;
--secondary-300: #93c5fd;
--secondary-400: #60a5fa;
--secondary-500: #3b82f6;  /* Links, info */
--secondary-600: #2563eb;
--secondary-700: #1d4ed8;
```

### Semantic Colors

```css
/* Success - Learning Progress */
--success-50: #f0fdf4;
--success-500: #22c55e;
--success-600: #16a34a;

/* Warning - Attention needed */
--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-600: #d97706;

/* Error - Errors, mistakes */
--error-50: #fef2f2;
--error-500: #ef4444;
--error-600: #dc2626;

/* Info - Neutral information */
--info-50: #f0f9ff;
--info-500: #0ea5e9;
--info-600: #0284c7;
```

### Neutral Palette (Reading Content)

```css
/* Dark mode support included */
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

### Reading Levels (CEFR Color Coding)

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

### Font Families

**Primary:** Inter (Google Fonts)
- Excellent readability at all sizes
- Vietnamese character support: ✓
- Optimized for UI elements and body text

**Reading:** Literata (Google Fonts)
- Designed for extended reading
- Vietnamese character support: ✓
- Used for: Long-form content, study passages

**Code/Monospace:** JetBrains Mono
- Clear, modern monospace
- Used for: Technical terms, code snippets

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-serif: 'Literata', Georgia, serif;
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 0.75rem (12px) | 1.5 | 500 | Labels, captions |
| `text-sm` | 0.875rem (14px) | 1.5 | 500 | Supporting text |
| `text-base` | 1rem (16px) | 1.6 | 400 | Body text (default) |
| `text-lg` | 1.125rem (18px) | 1.6 | 400 | Emphasized body |
| `text-xl` | 1.25rem (20px) | 1.5 | 500 | Subheadings |
| `text-2xl` | 1.5rem (24px) | 1.4 | 600 | Section headings |
| `text-3xl` | 1.875rem (30px) | 1.3 | 700 | Page titles |
| `text-4xl` | 2.25rem (36px) | 1.2 | 700 | Hero text |

### Reading Content Typography

```css
.reading-content {
  font-family: var(--font-serif);
  font-size: 1.125rem (18px);
  line-height: 1.8;
  letter-spacing: 0.01em;
  max-width: 70ch; /* Optimal reading length */
}
```

---

## Spacing System

Based on 4px base unit (Tailwind default).

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Small gaps |
| `space-3` | 12px | Compact padding |
| `space-4` | 16px | Default padding |
| `space-5` | 20px | Comfortable spacing |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large sections |
| `space-10` | 40px | Major divisions |
| `space-12` | 48px | Page margins |
| `space-16` | 64px | Hero spacing |

---

## Border Radius

```css
--radius-sm: 0.25rem (4px);   /* Small elements */
--radius-md: 0.375rem (6px);  /* Default */
--radius-lg: 0.5rem (8px);    /* Cards, buttons */
--radius-xl: 0.75rem (12px);  /* Large cards */
--radius-2xl: 1rem (16px);    /* Hero elements */
--radius-full: 9999px;        /* Pills, avatars */
```

---

## Shadows

```css
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## Component Patterns

### Buttons

```css
/* Primary Action */
.btn-primary {
  background: var(--primary-600);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-lg);
  font-weight: 500;
  transition: all 150ms ease;
}

.btn-primary:hover {
  background: var(--primary-700);
  transform: translateY(-1px);
}

/* Secondary Action */
.btn-secondary {
  background: var(--neutral-100);
  color: var(--neutral-700);
  border: 1px solid var(--neutral-200);
}
```

### Cards

```css
.card {
  background: var(--neutral-0);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.card-hoverable:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  transition: all 200ms ease;
}
```

### Input Fields

```css
.input {
  background: var(--neutral-0);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: border-color 150ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}
```

### Progress Indicators

```css
.progress-bar {
  background: var(--neutral-200);
  border-radius: var(--radius-full);
  height: 8px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, var(--primary-500), var(--secondary-500));
  height: 100%;
  transition: width 300ms ease;
}
```

---

## Animation Guidelines

### Principles
1. **Purposeful** - Every animation serves a function
2. **Subtle** - Never distract from content
3. **Fast** - 150-300ms duration
4. **Respectful** - Honor `prefers-reduced-motion`

### Standard Easing

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Durations

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

---

## Accessibility Standards

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- Interactive elements: 3:1 minimum

**Touch Targets:**
- Minimum: 44x44px (mobile)
- Recommended: 48x48px

**Focus States:**
- Visible focus indicator on all interactive elements
- Focus indicator: 2px solid var(--primary-500)
- Offset: 2px

**Keyboard Navigation:**
- All features accessible via keyboard
- Tab order follows visual layout
- Skip navigation link available

**Screen Reader Support:**
- Proper ARIA labels on interactive elements
- Semantic HTML structure
- Alt text for all images

---

## Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

**Mobile-First Approach:**
- Default styles: 320px - 639px
- sm: 640px+
- md: 768px+
- lg: 1024px+

---

## Layout Patterns

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-reading: 70ch;  /* Optimal for long-form reading */
```

### Grid System

```css
/* Reading content grid */
.reading-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-8);
  max-width: var(--container-reading);
}

@media (min-width: 1024px) {
  .reading-grid {
    grid-template-columns: 1fr 280px;  /* Content + sidebar */
  }
}
```

---

## Icon System

**Library:** Lucide Icons (via shadcn/ui)

**Key Icons:**
- `upload`: File upload
- `file-text`: Text/PDF input
- `youtube`: YouTube input
- `book-open`: Reading view
- `refresh-cw`: Processing
- `check-circle`: Success/Complete
- `x-circle`: Error
- `chevron-right`: Navigation
- `flame`: Streak
- `trophy`: Achievement
- `bar-chart-3`: Progress

---

## Dark Mode

### Color Mapping

```css
/* Dark mode backgrounds */
.dark {
  --neutral-0: #0a0a0a;    /* Inverted */
  --neutral-50: #171717;
  --neutral-100: #262626;
  --neutral-900: #fafafa;  /* Inverted */
}

/* Reading content in dark mode */
.dark .reading-content {
  background: #171717;
  color: #e5e5e5;
}
```

**Implementation:**
- Uses CSS custom properties for easy theming
- Respects `prefers-color-scheme`
- Manual toggle in user settings

---

## Voice & Tone

**App Voice:** Encouraging, clear, supportive

**Microcopy Examples:**
- "Great progress! Keep it up." (Success)
- "Almost there! One more step." (Progress)
- "Let's analyze your text..." (Processing)
- "Ready to learn something new?" (Welcome)

---

## Image & Asset Guidelines

### Reading Illustrations
- Style: Minimal, abstract
- Colors: Blue/indigo palette
- Format: SVG (scalable)

### User Avatars
- Shape: Circle
- Default: Initials with colored background
- Size: 32px, 40px, 48px

---

## Form Patterns

### Validation States

```css
/* Success */
.input-success {
  border-color: var(--success-500);
}
.input-success + .icon {
  color: var(--success-500);
}

/* Error */
.input-error {
  border-color: var(--error-500);
}
.input-error + .icon {
  color: var(--error-500);
}
```

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

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Reading Comprehension Test Pattern

### Purpose
Test user understanding of a reading passage through questions that require referencing the source text.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Progress Bar                          │
├──────────────────────┬──────────────────────────────────────┤
│   Reading Passage    │         Question Panel                │
│   (Always Visible)   │                                      │
│                      │  ┌─────────────────────────────────┐ │
│  ┌────────────────┐  │  │ Question #1              [Type] │ │
│  │                │  │  └─────────────────────────────────┘ │
│  │   Passage      │  │  ┌─────────────────────────────────┐ │
│  │   Content      │  │  │ Question text...                 │ │
│  │   with         │  │  └─────────────────────────────────┘ │
│  │   numbered     │  │  ┌─────────────────────────────────┐ │
│  │   lines        │  │  │ ○ Option A                       │ │
│  │                │  │  │ ○ Option B                       │ │
│  │                │  │  │ ○ Option C                       │ │
│  │                │  │  │ ○ Option D                       │ │
│  │                │  │  └─────────────────────────────────┘ │
│  │                │  │  ┌─────────────────────────────────┐ │
│  │                │  │  │    [ Check Answer ]             │ │
│  │                │  │  └─────────────────────────────────┘ │
│  │                │  │  ┌─────────────────────────────────┐ │
│  │                │  │  │ ✓ Correct! / ✗ Incorrect        │ │
│  │                │  │  │ Explanation...                   │ │
│  │                │  │  │ "From passage (Line 2):"         │ │
│  │                │  │  └─────────────────────────────────┘ │
│  └────────────────┘  │  [Review Passage] [Next Question]   │
│   Scrollable         │                                      │
└──────────────────────┴──────────────────────────────────────┘

Mobile: Stacked (Passage top, Question bottom)
Desktop: Side-by-side (Passage left, Question right)
```

### Component Specifications

#### Reading Passage Panel

```css
.passage-panel {
    background: var(--neutral-0);
    border-radius: var(--radius-2xl);
    border: 1px solid var(--neutral-200);
}

.passage-content {
    font-family: 'Literata', serif;
    font-size: 1.125rem;
    line-height: 1.8;
    max-height: 500px;
    overflow-y: auto;
    padding-left: var(--space-10); /* Space for line numbers */
}

.line-number {
    position: absolute;
    left: 0;
    width: var(--space-4);
    font-family: 'Inter', sans-serif;
    font-size: 0.6875rem;
    color: var(--neutral-400);
    text-align: right;
}

.highlight-source {
    background: linear-gradient(120deg, var(--primary-100), var(--primary-50));
    border-radius: var(--radius-sm);
    padding: 2px 4px;
}
```

**Key Features:**
- Always visible (no hiding/flip animation)
- Scrollable when content exceeds viewport
- Line numbers for easy reference
- Highlighting for answer sources
- CEFR badge and reading time indicator

#### Question Panel

```css
.question-panel {
    background: var(--neutral-0);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
}

.option-label {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 2px solid var(--neutral-200);
    border-radius: var(--radius-xl);
    cursor: pointer;
}

.option-label.selected {
    border-color: var(--primary-500);
    background: var(--primary-50);
}

.option-label.correct {
    border-color: var(--success-500);
    background: var(--success-50);
}

.option-label.incorrect {
    border-color: var(--error-500);
    background: var(--error-50);
}
```

**Question Types:**
- Multiple Choice (4 options)
- True/False (2 options)
- Fill in the Blank (text input)

#### Feedback States

```css
.feedback.correct {
    background: var(--success-50);
    border: 1px solid var(--success-200);
}

.feedback.incorrect {
    background: var(--error-50);
    border: 1px solid var(--error-200);
}

.feedback-source {
    margin-top: var(--space-3);
    padding: var(--space-3);
    background: var(--neutral-0);
    border-radius: var(--radius-lg);
    border-left: 3px solid var(--primary-400);
}
```

**Feedback Must Include:**
1. Correct/Incorrect indicator
2. Brief explanation
3. Source quote from passage with line number
4. Auto-scroll to highlight source in passage

### Responsive Behavior

```css
/* Mobile: Stacked layout */
.test-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-6);
}

/* Desktop: Side-by-side layout */
@media (min-width: 1024px) {
    .test-layout {
        grid-template-columns: 1fr 420px;
    }
}
```

### Progress Indicators

- **Progress Bar**: Shows question completion (e.g., "Question 3 of 5")
- **Streak Counter**: Consecutive correct answers (fire icon + count)
- **Score Summary**: At end (correct/incorrect counts)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1-4 | Select option A-D |
| Enter | Check answer / Next question |
| Space | Disabled (prevents accidental submission) |

### Interaction Flow

1. **Initial State**: Question displayed, options enabled, "Check Answer" disabled
2. **Select Option**: Highlight selected option, enable "Check Answer"
3. **Check Answer**:
   - Disable all options
   - Show correct (green) / incorrect (red) states
   - Display feedback panel
   - Highlight source in passage
   - Scroll passage to show source
4. **After Answer**: Show "Review Passage" and "Next Question" buttons
5. **Completion**: Show results summary with score

### Accessibility Notes

- All options must be keyboard accessible
- Focus visible on all interactive elements
- ARIA labels for question numbers and types
- Screen reader announces correct/incorrect state
- Color contrast meets WCAG 2.1 AA

### Animation Guidelines

- Feedback slide-in: 300ms ease-out
- Highlight transition: 200ms
- Passage scroll: smooth behavior
- No flip animations (unlike flashcard mode)

---

## Unresolved Questions

1. Should we support custom themes beyond light/dark mode?
2. Font size scaling options for accessibility (100%, 125%, 150%)
3. Should passage collapse on mobile after first question read?

---

**Status:** Active
**Last Updated:** 2026-04-20
