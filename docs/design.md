# Design System — Study Workspace

> Single source of truth for keeping color, buttons, icons, and layout consistent across the app.
> Spirit: **focused · youthful energy · modern yet friendly · not gaudy.**

---

## 1. Colors

### Neutrals (warm paper base)
| Role | Hex | Used for |
|---|---|---|
| Paper / App bg | `#F5F2EC` | global background, secondary panel fill |
| Side panel | `#FBF9F5` | Sources & Studio sidebars |
| Surface / Reader | `#FFFFFF` | cards, reading area, inputs |
| Border | `#EAE5DB` | dividers, card/input borders |
| Border strong (dashed) | `#DAD4C8` | "add source" placeholder |
| Dark anchor (rail) | `#221F2B` | left nav rail, primary text |

### Text
| Role | Hex |
|---|---|
| Primary text | `#221F2B` |
| Secondary text | `#565160` |
| Muted / caption | `#908B98` |

### Brand & accents
| Name | Base | Hover | Soft bg | Soft border | Text on soft |
|---|---|---|---|---|---|
| **Indigo** (brand, primary action) | `#5A4FE0` | `#4A3FD0` | `#ECEAFB` | `#D6D1F7` | `#4A3FD0` |
| **Coral** (accent / secondary CTA / highlight) | `#F2664A` | `#E0512F` | `#FCE7E1` | `#F9D9D0` | `#C8442B` |
| **Green** (success / known) | `#2FA66A` | `#1E7A4B` | `#DDF3E7` | `#CFEEDD` | `#1E7A4B` |
| **Amber** (warning / new) | `#EEA63C` | — | `#FBEFD8` | `#F8E4C2` | `#A66A12` |

**Color usage rules**
- Indigo leads: primary actions, active item, brand.
- Coral only for **reading highlights** + **one prominent CTA per screen**.
- Green for "correct / known / success" states.
- **Never** place > 2 accent colors side by side → avoids "gaudy".
- The dark rail is the anchor that lets the 3 light panels stand out.

### CSS variables (quick copy)
```css
:root {
  /* neutrals */
  --paper:#F5F2EC; --panel:#FBF9F5; --surface:#FFFFFF;
  --border:#EAE5DB; --border-strong:#DAD4C8; --rail:#221F2B;
  /* text */
  --ink:#221F2B; --ink-2:#565160; --ink-3:#908B98;
  /* indigo */
  --indigo:#5A4FE0; --indigo-hover:#4A3FD0; --indigo-soft:#ECEAFB; --indigo-soft-border:#D6D1F7;
  /* coral */
  --coral:#F2664A; --coral-hover:#E0512F; --coral-soft:#FCE7E1; --coral-text:#C8442B;
  /* green */
  --green:#2FA66A; --green-soft:#DDF3E7; --green-text:#1E7A4B;
  /* amber */
  --amber:#EEA63C; --amber-soft:#FBEFD8; --amber-text:#A66A12;
}
```

---

## 2. Typography

| Role | Font | Size / Weight |
|---|---|---|
| UI (default) | **Plus Jakarta Sans** | 11–14px · 400/500/600/700 |
| Large headings | Plus Jakarta Sans | 22–38px · 700/800, letter-spacing −0.02em |
| Reading / content | **Lora** (serif) | 18px · 1.85 line-height, max 66ch |
| Line numbers / code / hex | mono (`ui-monospace`) | 11px · color `#B8B2A6` |

- Section label: 11px, weight 700, `letter-spacing:0.13em`, UPPERCASE, color `#908B98`.
- Reading area can switch Serif ↔ Sans (tweak `readingTypeface`).

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

---

## 3. Corner radius (soft)

| Token | px | Used for |
|---|---|---|
| `radius-xl` | 16px | popup, large cards, modal |
| `radius-lg` | 14px | **buttons**, Studio cards, panel preview |
| `radius-md` | 12–13px | result cards, source rows, icon tiles |
| `radius-sm` | 10–11px | inputs, small buttons, segmented |
| `radius-pill` | 99px | badges, chips, avatar, dots |

> Rule: the larger the element, the rounder the corner. Standard button = **14px**.

---

## 4. Shadows (depth)

| Token | Value |
|---|---|
| Card subtle | `0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04)` |
| Raised (hover) | `0 4px 12px rgba(0,0,0,.07)` |
| Popup / modal | `0 4px 12px rgba(0,0,0,.06), 0 18px 40px rgba(0,0,0,.10)` |
| Indigo button | `0 2px 5px rgba(90,79,224,.30), 0 6px 16px rgba(90,79,224,.20)` |
| Coral button | `0 2px 5px rgba(242,102,74,.30), 0 6px 16px rgba(242,102,74,.18)` |

Button shadows are **tinted to the button color** (indigo/coral) for real depth.

---

## 5. Buttons

**Standard:** radius 14px · padding `11px 20px` · 14px/600 · transition `all 140ms ease`.

| Level | Bg | Text | Border | Shadow | Hover | Active (press) |
|---|---|---|---|---|---|---|
| **Primary** | `#5A4FE0` | white | — | indigo | `#4A3FD0` + lift `−1px` | sink `+1px`, reduce shadow |
| **Secondary** | `#FFFFFF` | `#221F2B` | `#EAE5DB` | card subtle | border+text → indigo, lift `−1px` | sink `+1px` |
| **Ghost** | transparent | `#565160` | — | — | bg `#F2EFE8` | bg `#EAE5DB` |
| **Danger** | `#F2664A` | white | — | coral | `#E0512F` + lift `−1px` | sink `+1px` |
| **Disabled** | `#F2EFE8` | `#A39EAA` | — | — | — (cursor not-allowed) | — |

**Press behavior:** `transform:translateY(1px)` + reduced shadow → "real press" feel.
**Small button:** padding `8px 14px`, radius 11px, 12px/600.
**Square icon button:** 38–40px, radius 12px, hover changes border color by context (✓ green, ✕ coral).

```html
<!-- Primary button -->
<button style="padding:11px 20px;border:none;border-radius:14px;background:#5A4FE0;color:#fff;
  font:600 14px 'Plus Jakarta Sans';cursor:pointer;transition:all 140ms ease;
  box-shadow:0 2px 5px rgba(90,79,224,.30),0 6px 16px rgba(90,79,224,.20);"
  onmouseover="this.style.background='#4A3FD0';this.style.transform='translateY(-1px)'"
  onmouseout="this.style.background='#5A4FE0';this.style.transform='none'">Save to vocabulary</button>
```

---

## 6. Badges & Chips

### CEFR levels — semantic difficulty scale (do NOT use 6 disjoint colors)
**A = easy (green) → B = mid (amber) → C = hard (coral)**, each with a light/dark step.

| | Bg | Text |
|---|---|---|
| A1 | `#DDF3E7` | `#1E7A4B` |
| A2 | `#CFEEDD` | `#176B40` |
| B1 | `#FBEFD8` | `#A66A12` |
| B2 | `#F8E4C2` | `#8A560C` |
| C1 | `#FCE7E1` | `#C8442B` |
| C2 | `#F9D9D0` | `#A8341E` |

Badge: `padding:4px 12px; border-radius:99px; font:700 12px`.

### Learning status (badge with leading dot)
| Status | Bg | Text | Dot |
|---|---|---|---|
| New | `#FBEFD8` | `#A66A12` | `#EEA63C` |
| Learning | `#ECEAFB` | `#4A3FD0` | `#5A4FE0` |
| Known | `#DDF3E7` | `#1E7A4B` | `#2FA66A` |

### Chip (filter / related)
`padding:5px 12px; border-radius:99px; border:1px solid #EAE5DB; background:#fff`.
Active = indigo bg, white text. Hover = indigo border/text.

---

## 7. Icons — **use inline SVG (NOT emoji)**

- **Lucide** set (open-source line icons). Draw directly as inline `<svg>` in markup — **do NOT** use `lucide.createIcons()` (it mutates the DOM and conflicts with the React runtime, causing crashes).
- Standard: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap/linejoin="round"`. Recolor via `style="color:…"`, resize via `width/height`.

```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#221F2B;">
  <!-- path… -->
</svg>
```

| Context | Lucide names |
|---|---|
| Navigation | `book-open` (Study), `languages` (Dictionary), `library` (Vocabulary), `bar-chart-3` (Progress), `settings`, `moon` |
| Sources / Upload | `file-text` (Text), `play-circle` (Video — *note: `youtube` does not exist in this build*), `file` (PDF), `link` (Web), `upload`, `search`, `plus` |
| Studio | `list-checks` (Quiz), `layers` (Flashcards), `align-left` (Summary), `message-circle` (Chat), `network` (Mind map), `globe` (Translate) |
| Actions | `check`, `x`, `rotate-ccw` (undo), `trash-2`, `download`, `bookmark` (save), `volume-2` (play audio), `chevron-left/right`, `arrow-up` (send) |

Icon color by context: **default** `#221F2B`/`#565160` · **muted** `#908B98` · **active** `#5A4FE0`.

---

## 8. 3-panel layout

```
[ Rail 62px ] [ Sources 262px ] [ Reader — flexible ] [ Studio 286px ]
   #221F2B         #FBF9F5            #FFFFFF              #FBF9F5
```

- **Rail** dark, 40px icons (radius 13px), active item bg `rgba(255,255,255,.14)`, indigo gradient logo on top, user avatar at bottom. Navigation controls (theme, language, user menu) live in the sticky top bar, not the rail.
- **Top bar** sticky, `bg-background/80 backdrop-blur-md`, carries: search (desktop only), LanguageSwitcher, ThemeToggle, AuthControls/user menu.
- **Side panels** warm paper `#FBF9F5`, 54px-tall header with UPPERCASE label + icon button.
- **Reader** pure white (sharpest text): 3px progress bar with indigo→coral gradient at top, meta bar (badge + read time + word count + segmented).
- Each panel scrolls internally; app frame is `height:100vh; overflow:hidden`.
- Indigo appears only on the active item → the eye instantly knows where it is.

---

## 9. Inputs & Segmented

- **Input:** `padding:9px 12px; border:1px solid #EAE5DB; border-radius:11px; background:#fff`. Focus → indigo border + glow `0 0 0 3px rgba(90,79,224,.10)`. Search icon sits inside (left), padding-left 33px.
- **Segmented:** bg `#F5F2EC`, border `#EAE5DB`, radius 11px, padding 3px. Active tab = white bg + subtle shadow + indigo text.

---

## 10. Spacing & rhythm

- Panel header padding: `0 16px`, height 54px.
- Reader padding: `36px 40px`.
- Studio grid gap: 8px · List gap: 7px · Source-row inner gap: 11px.
- Use **flex/grid + `gap`**, not loose margins, for groups of elements.

---

### Implementation notes (Design Component)
- All styles **inline**; only `@font-face`/`@keyframes`/resets go in `<helmet>`.
- Hover/press states: use `style-hover` / `style-active` / `style-focus`.
- Dynamic values (reading font, highlight color, line-number toggle) flow through `renderVals()` then read via `{{ }}` — keep everything else as literals so it paints immediately while streaming.
