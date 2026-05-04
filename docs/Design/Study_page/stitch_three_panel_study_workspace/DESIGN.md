---
name: Intellectual Dark Workspace
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#44e2cd'
  on-secondary: '#003731'
  secondary-container: '#03c6b2'
  on-secondary-container: '#004d44'
  tertiary: '#b9c8de'
  on-tertiary: '#233143'
  tertiary-container: '#8392a6'
  on-tertiary-container: '#1c2b3c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#d4e4fa'
  tertiary-fixed-dim: '#b9c8de'
  on-tertiary-fixed: '#0d1c2d'
  on-tertiary-fixed-variant: '#39485a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  h2:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  code:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  container-padding: 32px
---

## Brand & Style
This design system is engineered for deep work, synthesized knowledge, and AI-assisted discovery. It targets researchers, writers, and technical professionals who require a UI that recedes into the background to prioritize cognitive focus. 

The aesthetic is **Sophisticated Minimalism**. It avoids the "gamer" aesthetic common in dark modes, opting instead for a "monastic-tech" feel. The emotional response is one of quiet authority and clarity. High-legibility typography and a structural layout prioritize content hierarchy over decorative elements. Visual interest is generated through precise monochromatic layering and surgical use of accent colors to denote intelligence and interactivity.

## Colors
The palette is built on a foundation of "Midnight Slate." The primary background is a deep charcoal, while UI surfaces use a slightly lighter slate to create structural definition without relying on heavy shadows.

- **Primary (Indigo):** Reserved for primary actions, focus states, and the core "AI processing" signals.
- **Secondary (Soft Teal):** Used for constructive feedback, success states, and secondary highlights within data visualizations.
- **Neutrals:** A range of slates (from #0F172A to #94A3B8) provides the hierarchy. Pure white is avoided for body text to reduce eye strain, opting instead for high-contrast light grays.

## Typography
Typography is the primary vehicle for hierarchy. We use **Manrope** for headlines to provide a modern, slightly geometric character that feels balanced and professional. **Inter** is utilized for all functional and body text due to its exceptional legibility in dark environments and its neutral, utilitarian personality.

Key typographic principles:
- **Optical Sizing:** Larger headings use tighter letter spacing.
- **Readability:** Body text uses a generous line height (1.6) to prevent "color crushing" where lines of text appear too dense against the dark background.
- **Semantic Labels:** Small, uppercase labels are used for metadata and utility headers to differentiate from narrative content.

## Layout & Spacing
The layout uses a **Flexible Columnar System** inspired by multi-pane research tools. It prioritizes side-by-side comparison of sources and generated insights.

- **Panels:** The workspace is divided into three primary vertical zones: Sources (Left), Active Workspace (Center), and Studio/Insights (Right).
- **Rhythm:** A 4px baseline grid ensures consistent vertical alignment.
- **Negative Space:** Generous internal padding within panels (`24px` to `32px`) ensures that dense information feels approachable and organized.

## Elevation & Depth
In this dark environment, depth is communicated through **Tonal Layering** and **Low-Contrast Outlines** rather than traditional shadows.

1. **Floor (Level 0):** The base background (#0F172A).
2. **Surface (Level 1):** Sidebars and secondary panels (#1E293B). 
3. **Floating (Level 2):** Modals or active cards use a subtle 1px border (#334155) to separate from the surface. 
4. **Interactive Focus:** Elements being hovered or focused use a subtle glow or a slight increase in border brightness, avoiding heavy drop shadows which can feel muddy in dark themes.

## Shapes
The shape language is **Rounded**, using an 8px (`0.5rem`) base radius for standard components like buttons and inputs. This softens the technical nature of the workspace, making the AI interactions feel more "human" and approachable. Larger containers like workspace panels use `rounded-xl` (1.5rem) to create a distinct, nested appearance within the viewport.

## Components
This design system requires components that handle high density without losing clarity.

- **Buttons:** Primary buttons use a solid Indigo fill with white text. Secondary buttons are "ghost" style with a Slate-400 border that brightens on hover.
- **Chips/Tags:** Used for "Sources" or "Topics." These should have a subtle slate background and no border to keep the UI clean.
- **Input Fields:** Darker than the surface background to create an "inset" feel. Borders are invisible until focus, at which point they transition to a 1px Indigo stroke.
- **Cards (Studio Items):** Use subtle background gradients or slight opacity shifts to distinguish between different types of AI outputs (e.g., a "Briefing" vs. a "Timeline").
- **Scrollbars:** Custom-styled to be thin and unobtrusive, appearing only on hover to maintain the minimalist aesthetic.
- **AI Indicators:** Subtle pulsing animations or "Soft Teal" iconography should be used sparingly to indicate that an insight was generated by the system.