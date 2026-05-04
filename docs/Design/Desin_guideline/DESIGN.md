---
name: English Reading Training Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#454652'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#757683'
  outline-variant: '#c5c5d4'
  surface-tint: '#4257b4'
  primary: '#102b8a'
  on-primary: '#ffffff'
  primary-container: '#2e44a1'
  on-primary-container: '#acbaff'
  inverse-primary: '#b9c3ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#31363f'
  on-tertiary: '#ffffff'
  tertiary-container: '#484d56'
  on-tertiary-container: '#b9bec8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#273e9b'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#dee2ed'
  tertiary-fixed-dim: '#c2c6d1'
  on-tertiary-fixed: '#171c23'
  on-tertiary-fixed-variant: '#424750'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
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
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  sidebar-width: 280px
  max-content-width: 1200px
---

## Brand & Style

This design system is built upon a foundation of **Minimalism** and **Modern Corporate** aesthetics, specifically tailored for the focused environment of language acquisition. The brand personality is scholarly yet technologically advanced—think of it as a private digital library that is both quiet and empowering. 

The target audience consists of professional learners who value efficiency and clarity. The UI should evoke a sense of calm and academic rigor, using generous whitespace to reduce cognitive load and allow the educational content to remain the primary focus. Every element is designed to be unobtrusive, supporting a "deep work" state for the user.

## Colors

The palette is centered around a sophisticated **Deep Indigo** primary, chosen for its associations with intelligence and stability. This is supported by a more vibrant indigo for accents and a soft, tinted white for background layers to prevent eye strain during long reading sessions.

- **Primary (#2E44A1):** Used for key actions, brand elements, and progress indicators.
- **Secondary (#6366F1):** Used for hover states, active text highlights, and secondary interactions.
- **Tertiary (#F0F4FF):** A subtle "Paper" color used for card backgrounds and selected list items.
- **Neutral (#1E293B):** A deep slate used for maximum legibility in body text.
- **Background (#FFFFFF):** Pure white is used for the primary layout to maintain the "airy" feel.

## Typography

The design system utilizes **Inter** for all text elements. Inter’s tall x-height and neutral character make it exceptionally readable for long-form content. 

Reading passages should default to `body-lg` to ensure comfortable legibility across all devices. Headings use a slight negative letter spacing to feel more compact and "editorial," while labels and captions use slightly wider spacing for clarity at smaller sizes. Vertical rhythm is strictly enforced with a 1.6x line height for all body text to enhance the airy aesthetic.

## Layout & Spacing

This design system uses a **Fixed-Fluid Sidebar** layout model. The navigation remains fixed at 280px on the left, while the main content area expands to a maximum of 1200px to maintain optimal line lengths for reading.

A base 4px grid system governs all spacing.
- **Margins:** 48px (xl) padding around main content blocks to create a "gallery" feel.
- **Gutters:** 24px (lg) between grid items.
- **Density:** The system prioritizes "Low Density," utilizing generous padding within cards and containers to allow the content to breathe.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layers**. Instead of harsh borders, we use depth to define surface relationships.

1.  **Base Layer:** Pure white (#FFFFFF) background.
2.  **Surface Layer:** Very light gray (#F8FAFC) or Tertiary Indigo (#F0F4FF) for secondary panels like sidebars or progress trackers.
3.  **Elevated Layer:** Pure white cards with a "Sophisticated Shadow": `0px 4px 20px rgba(0, 0, 0, 0.04)`.
4.  **Interaction Layer:** When elements are hovered, shadows should shift to `0px 10px 30px rgba(46, 68, 161, 0.08)`, introducing a subtle tint of the primary color into the shadow.

## Shapes

The shape language is **Rounded**, conveying a friendly yet professional tone. 

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px) radius.
- **Large Elements (Cards, Content Containers):** 1rem (16px) radius.
- **Interactive Chips:** Fully pill-shaped to distinguish them from actionable buttons.

Corners should be smoothed (iOS-style continuous curves) where possible to maintain the premium feel.

## Components

### Buttons
- **Primary:** Solid Deep Indigo with white text. No border. Soft shadow.
- **Secondary:** Transparent background with a 1px border of the primary color.
- **Ghost:** Primary color text with no background, used for low-priority navigation.

### Input Fields
- Use a light gray background (#F1F5F9) instead of a border in their default state. 
- On focus, the field transitions to a white background with a 2px Deep Indigo border and a soft glow shadow.

### Cards
- Cards are the primary container for reading passages and quiz questions. 
- They must include at least 32px of internal padding to maintain the "airy" feel. 

### Progress Indicators
- Use slim, horizontal bars with rounded caps. 
- Background track should be a very pale version of the primary color, with the active progress in solid Deep Indigo.

### Specialized Components
- **Reading Progress Bar:** A thin, sticky bar at the top of the viewport that tracks reading depth.
- **Vocabulary Chips:** Small, pill-shaped tags used for highlighting difficult words within a text, utilizing the Tertiary color for the background.