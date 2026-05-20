# Dark Mode Color Design

**English Reading Training App**

Status: Draft  
Last Updated: 2026-05-20  
Source: `docs/Design/design-guidelines.md`

## Design Goal

Dark mode should feel like a quiet evening reading room: focused, warm, and low-glare. It must support long reading sessions without making the product feel like a terminal, gaming UI, or neon SaaS dashboard.

## Principles

- Keep content first. Reading panels need the strongest comfort and contrast.
- Use warm charcoal and ink tones instead of pure black.
- Preserve navy for authority, gold for study momentum, green for completion, red for danger.
- Use soft borders instead of heavy shadows.
- Keep saturated color mostly for actions, states, and CEFR markers.

## Token Mapping

These values are intended for `.dark` overrides in `src/app/globals.css`.

```css
.dark {
  /* Base surfaces */
  --background: #11100E;
  --foreground: #F7F2EA;
  --surface: #1A1815;
  --surface-elevated: #23201C;
  --border: #343029;
  --input: #23201C;

  /* Primary - Navy, lifted for dark surfaces */
  --primary: #8FB4E8;
  --primary-foreground: #0E1726;
  --ring: #A9C7EE;

  /* Secondary */
  --secondary: #2D3E55;
  --secondary-foreground: #F7F2EA;

  /* Muted */
  --muted: #211F1B;
  --muted-foreground: #B8AEA1;

  /* Accent - Gold */
  --accent: #2B241A;
  --accent-foreground: #F1C78F;
  --gold: #E0B57F;
  --gold-soft: #332719;

  /* Success */
  --success: #8FBC8A;
  --success-soft: #1E2A1E;

  /* Danger */
  --destructive: #E58A76;
  --danger: #E58A76;
  --danger-soft: #351F1A;

  /* Card & Popover */
  --card: #1A1815;
  --card-foreground: #F7F2EA;
  --popover: #23201C;
  --popover-foreground: #F7F2EA;

  /* Charts */
  --chart-1: #8FB4E8;
  --chart-2: #E0B57F;
  --chart-3: #8FBC8A;
  --chart-4: #C7A6F2;
  --chart-5: #E58A76;

  /* Sidebar */
  --sidebar: #171512;
  --sidebar-foreground: #F7F2EA;
  --sidebar-primary: #8FB4E8;
  --sidebar-primary-foreground: #0E1726;
  --sidebar-accent: #2B241A;
  --sidebar-accent-foreground: #F1C78F;
  --sidebar-border: #343029;
  --sidebar-ring: #A9C7EE;

  /* CEFR levels - keep recognizable but less fluorescent */
  --cefr-a1: #7DDC9D;
  --cefr-a2: #B7D96A;
  --cefr-b1: #E7CF5D;
  --cefr-b2: #E6A94D;
  --cefr-c1: #E98BBE;
  --cefr-c2: #B9A4F4;
}
```

## Usage Guidance

| Token | Use | Avoid |
|-------|-----|-------|
| `--background` | app shell, page background | cards or popovers |
| `--surface` | reading panels, cards | nested cards |
| `--surface-elevated` | dropdowns, dialogs, inputs | full page background |
| `--primary` | primary buttons, active nav, focus | passive decoration |
| `--gold` | review momentum, highlights, due items | every CTA |
| `--success` | completion and correct states | neutral progress |
| `--danger` | errors and destructive actions | warning-only states |

## Reading Components

Reading content should use:

```css
.dark .reading-content {
  color: var(--foreground);
}

.dark .highlight-source {
  background: linear-gradient(120deg, var(--gold-soft), var(--surface));
}
```

Line numbers and secondary annotations should use `--muted-foreground`, not opacity-only black or white.

## Interaction States

- Hover: raise surface one level or increase border contrast.
- Active: use `translate-y-px` or stronger border, not large color jumps.
- Focus: `2px` visible ring using `--ring`.
- Disabled: reduce opacity but keep text readable enough to identify the control.

## Accessibility Checks

Required checks before shipping:

- Body text on `--background`.
- Reading text on `--surface`.
- Muted text on `--surface`.
- Primary button text on `--primary`.
- Gold highlight text/background combinations.
- Error text/background combinations.

## Implementation Notes

- Use class-based dark mode: `.dark`.
- Keep Tailwind classes semantic: `bg-background`, `bg-surface`, `text-foreground`, `border-border`.
- Do not add hardcoded hex values in components.
- Do not modify `src/components/ui/*` primitives unless a primitive has a token bug.
- Update `docs/Design/styling-guide.md` after implementation so it matches `src/app/globals.css`.
