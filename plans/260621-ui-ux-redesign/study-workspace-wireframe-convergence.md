# Study Workspace — wireframe convergence plan

## Context

The wireframe at `docs/Design/wireframes/Study Workspace.dc.html` is the visual north-star for the Study page, but the current implementation in `src/features/study/ui/` diverges from it in several structural and visual ways. We want the end UI to **match the wireframe** while keeping useful enhancements (resizable panels, dark mode, existing API integrations).

The wireframe defines a 3-panel Study Workspace: dark 62px left nav rail, 262px light Sources panel, flexible white Reader with a 53px meta bar, 286px light Studio panel that expands into a 640px slide-in overlay, and a centered Settings modal opened from the rail. Color tokens (`#5A4FE0` indigo, `#F2664A` coral, `#F5F2EC` paper, `#FBF9F5` panel, `#EAE5DB` border, `#221F2B` rail) are already wired into Tailwind in `src/app/globals.css` — so the work is structural/layout/component, not tokens.

## User decisions

1. **Settings modal** — add a centered Settings modal matching the wireframe. Mount from the rail settings icon. **Delete the +/add-source button and user avatar from the rail** (the wireframe has none; the rail is icon-only nav + settings + theme). The plus button moves into the Sources panel header (where the wireframe already has it). The avatar moves into the top bar with the user/auth controls.
2. **Studio panel** — build the **slide-in overlay pattern** (286px panel + 640px right-sliding overlay), but **only Quiz / Chat / Lookup** as working views. Flashcards / Summary / Mindmap / Translate tiles stay visible but disabled (matches wireframe; flashcard already disabled at `studio-panel.tsx:95`).
3. **Reader top bar** — move CEFR badge, read time, word count, Original/Simplified segmented into a **separate 53px sticky row above the reading title**, with a real 3px indigo→coral progress bar that updates on scroll.
4. **Resizable panels** — keep `react-resizable-panels` and the collapse buttons.

## End UI — what the page should look like

### Layout (left → right, `100vh`, `overflow:hidden`)

```
[ Rail 62px ] [ Sources 262px ] [ Reader — flex ] [ Studio 286px ]
   #221F2B        #FBF9F5            #FFFFFF           #FBF9F5
   (dark)        (panel)            (surface)          (panel)
```

- **Top bar** stays sticky above everything (search, language switcher, theme toggle, auth/avatar) — unchanged.
- Resizable separators (4px) between panels; collapse buttons on the inner edges of Sources and Studio (current behavior preserved).

### Left rail (`src/ui/layout/dashboard-sidebar.tsx`)

- 62px wide, `bg-rail` (#221F2B), vertically centered icon tiles, 40×40px, 13px radius.
- Indigo gradient logo tile at top.
- Nav tiles (Study / Dictionary / Vocabulary / Progress) with `bg-white/[0.14]` active state.
- **REMOVE** the `+` (add source) tile and the avatar tile.
- **KEEP** Settings + Theme tiles at the bottom (settings opens the new modal; theme cycles light/dark).
- Delete the related code paths for `onAddSource` and `user` props from the rail.

### Sources panel (`src/features/study/ui/sources-panel.tsx`)

- 54px panel header — uppercase "Sources" label on the left, **two icon buttons on the right**: indigo `+` (primary, add source) and outlined `chevron-left` (collapse panel). Matches wireframe lines 53–62.
- Search input (already implemented, just restyle to `bg-paper` + `border-border` per design.md §9).
- Source list — rows with 32×32 icon tile, title (13px / 600), meta (11px / muted). Active row: `bg-primary/10 border border-primary/20`; hover: `bg-muted border border-border`. Matches wireframe 73–112.
- "Add source" dashed placeholder at the bottom of the list (visual only, opens upload modal).
- Empty / no-match states remain.

### Reader panel (`src/features/study/ui/studio/content/content-panel.tsx`)

Restructure into:

1. **3px progress bar** at the very top — `bg-paper` track, filled portion `bg-gradient-to-r from-primary to-coral` (indigo → coral). Wire-up: track `scroll` of the content scroll container; on `useEffect` listener compute `scrollTop / (scrollHeight - clientHeight)`.
2. **53px meta bar** — sticky below the progress bar: CEFR badge (use `<Badge variant={getCEFRBadgeVariant(level)}>`), read time, word count on the left; Original/Simplified segmented on the right. The segmented control uses `bg-paper` + `border border-border` + 3px inner padding per design.md §9 (current code uses `bg-muted` — change to `bg-paper`).
3. **Reading content** — title (27px serif, 600), then paragraphs in `reading-content` with Lora serif 18px / 1.85 line-height / `max-w-[66ch]` (per design.md §2 and wireframe 140–141). Indent 34px left for line numbers if a `showLineNumbers` setting is on (default on, matches wireframe 143).
4. CEFR A1/A2 levels skip the simplify button (existing `SKIP_SIMPLIFY_LEVELS`); otherwise show the "Simplify" button or the segmented.

### Studio panel (`src/features/study/ui/studio/studio-panel.tsx`)

Restructure into the two-mode pattern:

1. **Collapsed (default)** — 286px wide:
   - 54px header: uppercase "Studio" label, single `chevron-right` collapse button.
   - **2×3 grid of action tiles** (6 tiles, matches wireframe 185–209): Quiz, Flashcards, Summary, Mind map, Chat, Translate. **Wire only Quiz, Chat, Lookup — others get `disabled: true`** with `opacity-40` and a tooltip "Coming soon". Match wireframe tile styles: 14px radius, 14×8 padding, icon (21px indigo) + 11.5px label, hover lift + indigo border.
   - **Separator + "Library" section**: small uppercase label, count badge, then a list of saved-artifact rows (icon tile + title + meta + chevron-right). Reuse the current artifact list rendering (lines 449–548) but wrap it in this new section header.
2. **Expanded (overlay)** — 640px wide, slides in from the right over the studio panel + reader (z-index 90, backdrop `bg-rail/40 backdrop-blur-sm`):
   - **Header** — back arrow (returns to library), action icon tile, action title + sub, "All tools" outline button (closes overlay), `X` close button.
   - **Body** — switch on `studioAction`:
     - `quiz` → existing `QuizContent`
     - `chat` → existing `StudyChatPanel` (replace the in-place chat view)
     - `lookup` → existing `StudyLookupPanel` (replace the in-place lookup view)
     - `flashcard` / `summary` / `mindmap` / `translate` → placeholder "Coming soon" (disabled tiles, so this state should never be entered in practice; guard anyway)
   - Reuse the existing `viewingChat` and `viewingLookup` local state but route them through a single `studioAction: 'quiz' | 'chat' | 'lookup' | null` state.

### Settings modal (new file: `src/features/study/ui/settings-modal.tsx`)

- Centered, max-width 560px, max-height 88vh, scroll inside, `bg-surface` + 22px radius + popup shadow.
- Trigger: rail's settings icon. Body: sectioned groups with UPPERCASE labels.
  - **Language** — UI language dropdown (reuse `<LanguageSwitcher>` semantics in modal form), translation target segmented (Tiếng Việt / English).
  - **Level** — 6 CEFR chips (A1–C2) in a 6-column grid.
  - **Goals** — Daily goal segmented (10 / 20 / 30 min), Review reminders toggle.
  - **Audio** — Voice segmented (US / UK), Auto-play on lookup toggle.
  - **Display** — Theme segmented (Light / Dark / System), Reading text size segmented (A− / A / A+).
- Sticky header (title + close), sticky footer ("Saved automatically" hint + Done primary button).
- Wire to the same stores the top-bar controls use (`useSettingsStore` or equivalent — find during impl) so the modal is the canonical source.
- Add to `study-workspace-client.tsx` as a sibling of the upload modal.

### Top bar (`src/ui/layout/dashboard-sidebar.tsx`)

- Stays as is, but **the user avatar now lives here** (it was removed from the rail). Search, language switcher, theme toggle, and auth controls remain.
- When the Settings modal is open, the theme toggle in the top bar can either be hidden or kept (keep — the wireframe doesn't forbid it, and the modal's Display group also edits theme).

## Files to modify / create

**Modify**
- `src/ui/layout/dashboard-sidebar.tsx` — drop add-source tile, drop avatar tile, mount Settings modal trigger.
- `src/features/study/ui/sources-panel.tsx` — wireframe-style header (split `+` and chevron), use `bg-paper` for search, dashed add-source placeholder at list bottom.
- `src/features/study/ui/studio/content/content-panel.tsx` — restructure into progress bar / 53px meta bar / reading content; live scroll progress; paper-colored segmented.
- `src/features/study/ui/studio/studio-panel.tsx` — split into collapsed (panel) + expanded (overlay) states, 2×3 action grid, library section, slide-in 640px overlay routing.
- `src/features/study/ui/study-workspace-client.tsx` — add `settingsOpen` state + Settings modal; remove `viewingChat` / `viewingLookup` from this layer (move into studio panel as `studioAction`).
- `src/app/globals.css` — confirm the 4 existing `panel-scroll` and progress-bar keyframes are reusable; add a `slide-in-from-right` keyframe if not present.

**Create**
- `src/features/study/ui/settings-modal.tsx` — new component, ~200 lines, uses `Card` + `Button` + `Badge` + `<Switch>` primitives. Pure UI; reads/writes via props.
- `src/features/study/ui/studio/coming-soon-panel.tsx` — small placeholder for disabled studio actions (Flashcards / Summary / Mindmap / Translate).
- `src/hooks/use-scroll-progress.ts` (or co-located in content-panel) — IntersectionObserver-free scroll listener that returns `0..1` for the reading container. ~20 lines.

**Reuse (do not rewrite)**
- `Badge` from `src/ui/primitives/badge.tsx` and `getCEFRBadgeVariant` from `src/contracts/ui/cefr-style.ts` for the CEFR chip.
- `Button` variants (`default`, `outline`, `ghost`, `coral`) from `src/ui/primitives/button.tsx`.
- `LanguageSwitcher` and `ThemeToggle` from `src/ui/layout/` — refactor to share their internal logic with the Settings modal so both views stay in sync.
- `Card` / `CardContent` from `src/ui/primitives/card.tsx`.
- `cn` from `@/contracts/utils`.
- `calculateReadingTime` from `@/contracts/reading-utils`.

## Verification

1. `pnpm run typecheck` — passes.
2. `pnpm run lint` — passes.
3. `pnpm run test` — passes (no new tests required for purely visual changes; existing tests should still pass).
4. Manual smoke (or via `pnpm run dev` + Playwright if desired):
   - Open `/[locale]/study` with at least one passage.
   - Top bar visible, rail shows nav + settings + theme only (no +/avatar).
   - Sources panel header has `+` and chevron; list of sources renders with active state on the selected one; search filters; empty / no-match / no-sources states all render.
   - Reader: 3px gradient bar at top fills as you scroll the reading area; 53px meta bar shows CEFR / read time / word count on the left, Original/Simplified segmented on the right; switching modes swaps the content; selecting text in the reading area shows the translation popup near the selection.
   - Studio: 286px panel shows 2×3 grid; only Quiz / Chat / Lookup tiles are clickable; click one → 640px overlay slides in from the right with scrim behind; back arrow / X / "All tools" all return to the 286px panel; library list shows running + completed artifacts.
   - Settings: rail settings icon opens the centered modal; all 5 groups render; toggles / segmented controls work; Done closes; values persist across reload (verify the store hook in use).
   - Dark mode: toggle from the rail and verify all surfaces use the dark tokens from `docs/Design/design.dark.md`.
5. Visual diff vs the wireframe at `docs/Design/wireframes/Study Workspace.dc.html` — confirm structural alignment (rail / sources / reader / studio / settings modal).

## Out of scope

- Implementing Flashcards / Summary / Mindmap / Translate as actual features. Tiles are visible + disabled; Settings modal can list them or not (wireframe shows them in Studio, not Settings).
- Removing `react-resizable-panels` — keep.
- Changing the upload modal — keep as is.
- New i18n strings beyond what already exists; reuse `Study`, `Study.common`, etc. namespaces.
