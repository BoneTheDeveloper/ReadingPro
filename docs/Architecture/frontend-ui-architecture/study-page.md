# Study Page

## Route

Route:

`/[locale]/study`

Route file:

`src/app/[locale]/(dashboard)/study/page.tsx`

Purpose:

Main study workspace where users select a passage, read content, simplify text, use AI chat, generate quizzes, inspect results, translate selected text, and save vocabulary.

## Rendering Boundary

- `page.tsx` is a Server Component route entry.
- It authenticates the user, loads owned passages with `getUserPassages`, maps them into serializable `PassageData`, and renders the interactive client.
- `src/features/study/ui/study-workspace-client.tsx` is the root Client Component for the study workspace.

Current root component:

`StudyPageClient`

## Screen Layout

The Study page is a full-height three-panel workspace inside the dashboard shell.

```text
StudyPageClient
+-- Fixed top reading progress bar
+-- Study panel group
|   +-- Left: StudySourcesPanel
|   +-- Center: StudyContentPanel
|   +-- Right: StudyStudioPanel
+-- StudyUploadModal
```

The workspace uses `react-resizable-panels`:

- Group id: `study-panels`
- Panel ids: `source`, `content`, `studio`
- Layout persistence: `useDefaultLayout` with `sessionStorage`
- Left collapsed size: `60px`
- Right collapsed size: `60px`
- Left expanded default size: `280px`
- Right expanded default size: `280px`
- Center panel minimum size: `220px`

The page background is muted. Each primary panel is a bordered surface/card with internal scrolling via `panel-scroll`. The center reading panel is the visual priority.

## Component Hierarchy

Use this hierarchy as the source of truth when changing Study UI composition.

```text
src/app/[locale]/(dashboard)/study/page.tsx
+-- StudyPageClient
    +-- useStudyWorkspaceState
    +-- useStudyActions
    +-- useStudyPanelLayout
    +-- react-resizable-panels Group#study-panels
    |   +-- Panel#source
    |   |   +-- StudySourcesPanel
    |   +-- Panel#content
    |   |   +-- StudyContentPanel
    |   |   +-- StudyTranslationPopup
    |   +-- Panel#studio
    |       +-- StudyStudioPanel
    |           +-- StudyChatPanel
    |           +-- StudyTranslatePanel
    |           +-- QuizContent
    |               +-- QuizResults
    +-- StudyUploadModal
```

Supporting modules:

```text
src/features/study/model/types.ts
+-- Shared UI and client state types

src/features/study/model/selection-utils.ts
+-- DOM selection extraction and popup geometry inputs

src/features/study/api/study-api.ts
+-- Client API helpers used by quiz and question generation

src/features/study/actions/*
+-- Server actions invoked from Study UI hooks and upload modal
```

Target upload-related placement:

```text
src/features/study/ui/upload/study-upload-modal.tsx
+-- Study-specific modal shell and workspace callbacks

src/features/upload/ui/*
+-- Reusable upload form, dropzone, and text input pieces

src/features/upload/actions/*
+-- Shared upload mutation entrypoints

src/lib/passages/services/*
+-- Reusable Passage domain services

src/lib/passages/repositories/*
+-- Passage repository/database access
```

## Composition Rules

- `page.tsx` stays server-only and only prepares initial `PassageData`.
- `StudyPageClient` is the only root Client Component for the Study route.
- `StudyPageClient` composes panels, owns cross-panel state, and wires handlers.
- Panel components own their visual layout and panel-local interaction.
- Studio detail views are children of `StudyStudioPanel`; do not mount them beside the studio panel.
- Reader selection UI belongs to the center panel area; the selection state is lifted to `StudyPageClient` because studio translation details also need it.
- Study-specific upload composition belongs in `StudyUploadModal`; upload state is surfaced to `StudySourcesPanel` as an upload row.
- Upload form pieces, input validation, file/text normalization, and upload-specific workflow should move to `src/features/upload` instead of being duplicated inside Study.
- Reusable Passage domain logic should live in `src/lib/passages`, not in Study or Upload UI.
- Quiz runtime state belongs in `QuizContent`; quiz completion display belongs in `QuizResults`.
- Chat transport and chat history bootstrap currently belong in `StudyChatPanel`.
- Durable ownership checks, provider calls, DB writes, and route contracts stay outside visual components.

When adding a Study subcomponent, place it by ownership:

| New UI concern | Put it under |
|----------------|--------------|
| Source list, source search, source row, source menu | `StudySourcesPanel` or `src/features/study/ui/sources-*` |
| Passage reading, reader metadata, selection capture | `StudyContentPanel` or `studio/content/*` |
| Floating selected-text action | `StudyTranslationPopup` or `studio/translate/*` |
| Studio action grid, results list, collapsed studio rail | `StudyStudioPanel` |
| Chat messages, chat input, stream controls | `studio/chat/*` |
| Translation detail, save vocabulary, ask AI from selection | `studio/translate/*` |
| Quiz taking and quiz results | `studio/quiz/*` |
| Study upload modal shell and Study workspace callbacks | `src/features/study/ui/upload/*` |
| Reusable upload form, dropzone, text input, upload schema, upload workflow | `src/features/upload/*` |
| Reusable passage creation, reads, ownership, repository access | `src/lib/passages/*` |
| Cross-panel state or orchestration | `StudyPageClient` or `src/features/study/model/use-*` |
| Server mutation or ownership logic | `src/features/study/actions/*` or `src/lib/study/*` |

## Root Client: StudyPageClient

File:

`src/features/study/ui/study-workspace-client.tsx`

Responsibilities:

- Compose the three resizable panels.
- Initialize workspace state from `initialPassages`.
- Keep content view mode, current text selection, quick translation state, saved vocabulary keys, and translation-detail visibility.
- Fetch `/api/study-results` when the active passage changes.
- Wire source, reader, studio, translation popup, and upload modal handlers.
- Guard quick translation request ordering with request ids.

Should not own:

- Source row rendering.
- Reader paragraph rendering.
- Studio card rendering.
- Quiz question flow.
- Chat message rendering.
- Upload modal internals.

If this file grows, extract orchestration into hooks before adding more JSX branches.

## Left Panel: Sources

Component:

`src/features/study/ui/sources-panel.tsx`

Purpose:

Source selection and source management.

Expanded state:

- Header with uppercase `Sources` label and collapse icon.
- Search field for filtering passage titles.
- Primary add-source button.
- Scrollable source list.
- Upload progress row when content is being analyzed.
- Per-source row with source icon, title, date, and hover-only delete menu.

Collapsed state:

- Icon-only vertical rail.
- Top collapse/expand icon.
- Add-source icon.
- Source icons only, with `title` tooltip text.
- Active PDF/text sources use primary/blue styling.
- Active YouTube sources use red styling.

Interaction rules:

- Selecting a source updates `activePassageId`.
- Deleting is intentionally behind a row menu, not a primary row action.
- Empty state should invite adding a source without overwhelming the reading area.

Component boundary:

- Receives `documents`, `activeId`, upload status, and callbacks from `StudyPageClient`.
- Owns search query and filtered rendering.
- Does not fetch passages.
- Does not mutate server state directly except through callbacks.
- Does not know about reader or studio state.

## Center Panel: Reader

Component:

`src/features/study/ui/studio/content/content-panel.tsx`

Purpose:

Primary reading surface for the active passage.

Visual hierarchy:

1. Passage title and reading content.
2. Simplified/original mode control or simplify action.
3. CEFR, reading time, and word count metadata.
4. Inline errors.

Reader states:

- No active passage: centered empty state with add-source action.
- Simplifying: centered loading state with spinner and helper copy.
- Active passage: scrollable reading content with max width around `70ch`.
- Error: destructive inline notice below content.

Reading controls:

- If simplified content exists, show a two-option segmented control for `simplified` and `original`.
- If no simplified content exists and the original CEFR level is above A2, show a compact `Simplify` action.
- For A1/A2 passages, hide simplify because the content is already beginner-friendly.

Selection translation:

- Text selection is captured only inside the reading content container.
- Selection metadata is built by `extractSelectionInfo`.
- Over-limit selections are cleared before translation.
- A compact floating translate icon appears near the selection release point.
- After translation starts, a fixed 280px popup shows source text, loading/error/success state, and a details action.

Component boundary:

- Receives `passage`, simplifying state, error state, view mode, and callbacks.
- Owns `contentRef` and mouse selection capture.
- Uses `extractSelectionInfo` for DOM selection details.
- Does not call translation APIs.
- Does not save vocabulary.
- Does not render studio details.

Translation popup:

- `StudyTranslationPopup` is mounted by `StudyPageClient` inside the center panel container.
- It owns only popup/icon positioning, dismissal, and translate/details button UI.
- It does not own selected-text state or the translation request.

## Right Panel: Studio

Component:

`src/features/study/ui/studio/studio-panel.tsx`

Purpose:

Contextual learning tools, generated artifacts, chat, translation details, and quiz rendering.

Expanded state:

- Header with uppercase `Studio` label and collapse icon.
- Grid of action cards:
  - Quiz
  - Flashcards, disabled
  - Summary
  - Chat
  - Mind map, disabled
  - Translate
- Results list below action cards.
- Empty states for no active passage and no generated results.

Collapsed state:

- Icon-only vertical rail.
- Top collapse/expand icon.
- Studio action icons.
- Running result indicators.
- Completed artifact icons.

Detail states replace the default studio list:

- Chat detail: back button, chat title, `StudyChatPanel`.
- Translation detail: back button, selected text title, `StudyTranslatePanel`.
- Artifact detail: back button, artifact heading, quiz or summary content.

Concurrency rules:

- Maximum concurrent generated result actions: `3`.
- Summary and quiz actions lock while the same generation type is running.
- Chat remains available independently of generated result concurrency.

Component boundary:

- Receives result cache, active passage, selected result ref, result details, translation selection, and callbacks.
- Owns local view switches for chat and chat prefill.
- Owns the default studio action grid and results list rendering.
- Owns collapsed studio rail rendering.
- Does not fetch study results.
- Does not generate quiz or summary artifacts directly; it calls `onActionClick`.
- Does not own quick translation request state.

Nested studio views:

| View | Component | Owner |
|------|-----------|-------|
| Default studio action grid | `StudyStudioPanel` | `StudyStudioPanel` |
| Results list | `StudyStudioPanel` | `StudyStudioPanel` |
| Chat detail | `StudyChatPanel` | `StudyStudioPanel` mounts it |
| Translation detail | `StudyTranslatePanel` | `StudyStudioPanel` mounts it |
| Quiz artifact detail | `QuizContent` | `StudyStudioPanel` mounts it |
| Quiz completion | `QuizResults` | `QuizContent` mounts it |
| Summary artifact detail | Inline summary block | `StudyStudioPanel` |

## Upload Modal

Current file:

`src/features/study/ui/upload-modal.tsx`

Target file:

`src/features/study/ui/upload/study-upload-modal.tsx`

Purpose:

Modal for adding a Study source from a file or pasted text.

Component hierarchy:

```text
StudyUploadModal
+-- Dialog
    +-- Search input placeholder
    +-- Dropzone
    +-- SourceButton grid
    +-- File mode
    +-- Text mode
    +-- Error notice
    +-- Cancel action
```

State:

- `activeMode`: `null`, `file`, or `text`.
- `error`: modal-local validation error.
- `pastedText`: text mode content.

Boundary:

- Current implementation uses `studyUploadAction` for server mutation.
- Target implementation should consume the upload use case from `src/features/upload` while keeping Study workspace callbacks local.
- Target upload flow is `StudyUploadModal -> createUploadedPassageAction -> createUploadedPassageService -> createPassageService -> passageRepository`.
- Calls `onUploadStart`, `onUploadComplete`, and `onUploadError` so `StudyPageClient` can update workspace state.
- Closes immediately after upload starts so progress appears in the sources panel.
- Does not directly append passages to state.

## State Ownership

Workspace state is split by responsibility:

| Concern | Owner |
|---------|-------|
| Active passage, upload modal, document list, errors | `useStudyWorkspaceState` |
| Simplify, quiz generation, studio action dispatch | `useStudyActions` |
| Panel refs, collapse state, persisted layout | `useStudyPanelLayout` |
| Selected text, quick translation, saved vocabulary keys | `StudyPageClient` |
| Selection geometry and context extraction | `selection-utils.ts` |
| Source panel local search | `StudySourcesPanel` |
| Reader DOM ref and selection start tracking | `StudyContentPanel` |
| Studio chat/detail local view switches | `StudyStudioPanel` |
| Chat messages, stream status, chat input | `StudyChatPanel` |
| Quiz current question, selected answer, feedback, attempt ids | `QuizContent` |
| Upload modal mode, pasted text, modal-local validation | `StudyUploadModal` |

Do not move ownership checks, persistence rules, or route response contracts into these UI components. Those belong in server actions, route handlers, feature API helpers, or `src/lib`.

## Data And Action Boundaries

| Flow | UI entry | Boundary module |
|------|----------|-----------------|
| Initial passage load | Route page | `getAuthenticatedUser`, `getUserPassages` |
| Select passage | `StudySourcesPanel` callback | `useStudyWorkspaceState` |
| Delete passage | `StudySourcesPanel` callback | `useStudyWorkspaceState` -> study delete action |
| Upload passage | `StudyUploadModal` | `studyUploadAction` |
| Simplify passage | `StudyContentPanel` or summary card callback | `useStudyActions` -> `studySimplifyAction` |
| Generate quiz | `StudyStudioPanel` action card | `useStudyActions` -> `generateStudyQuestions` |
| Fetch study results | Active passage effect | `StudyPageClient` -> `/api/study-results` |
| Quick translate | `StudyTranslationPopup` callback | `StudyPageClient` -> `/api/translate` |
| Save selected vocabulary | `StudyTranslatePanel` callback | `StudyPageClient` -> `/api/vocabulary` |
| Chat history and stream | `StudyChatPanel` | `/api/study-chat` |
| Quiz attempt start/complete | `QuizContent`, `QuizResults` | `src/features/study/api/study-api.ts` |

Rule: if a visual component needs one of these flows, pass a callback down from the owner instead of importing unrelated state from another panel.

## Visual Contract

- The Study page should feel like a focused reading desk with side utilities, not a marketing page.
- The center reader must remain the dominant visual area.
- Source and studio panels may use cards because they are framed tools.
- Avoid nested card layouts inside the reader.
- Use compact uppercase labels for panel headers.
- Use icon-only buttons for collapse, back, source type, studio actions, and popup controls.
- Use restrained hover states, subtle borders, and muted backgrounds.
- Keep long titles and selected text truncated in panel headers.
- Keep all panel content scrollable inside the panel, not the page body.

## Naming Rules

- Keep the route root named `StudyPageClient` unless the component is renamed in code and docs together.
- Use `Study*Panel` only for major workspace regions.
- Use `*Popup` for fixed/floating overlays anchored to reader selection.
- Use `*Modal` for dialog-based workflows.
- Use `*Content` for detail bodies mounted inside another panel.
- Use `*Results` for terminal/completion views.
- Do not introduce generic names like `LeftPanel`, `RightPanel`, `MainContent`, or `CardGrid` in Study UI.

## References

- Study flow: [../../Flows/study-flow.md](../../Flows/study-flow.md)
- Study route: `src/app/[locale]/(dashboard)/study/page.tsx`
- Study UI: `src/features/study/ui`
- Study model hooks: `src/features/study/model`
