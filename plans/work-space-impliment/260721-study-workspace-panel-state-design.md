# Study Workspace — Panel State Design

## Context
User wants to refactor `StudyWorkspace` so panels own their own logic instead of the big workspace orchestrating everything.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Who owns activePassageId? | **Workspace** — passage is the cross-panel entity |
| 2 | Where does translation logic live? | **ContentPanel** — self-contained reading flow |
| 3 | Who owns studio artifact state? | **Workspace** coordinates; StudioPanel receives narrow slices |
| 4 | Where is upload modal rendered? | **Workspace level** (middle of app), SourcesPanel triggers via callback |
| 5 | Who owns chat open/close? | **StudioPanel** internally |

## Workspace (Big Orchestrator)

**Owns:**
- `passages: PassageData[]` — single source of truth
- `activePassageId: string | null`
- `StudyStatus: "idle" | "uploading" | "analyzing" | "ready" | "error"`
- `error: string | null`
- `uploadModalOpen: boolean` (controls modal visibility)
- All studio artifact caches (see below)
- `useStudyPanelLayout()` — panel resize/collapse state

**Renders:**
- `SourcesPanel` (left)
- `ContentPanel` (center)
- `StudioPanel` (right)
- `UploadModal` (overlay at workspace level)

**Wires:**
- Pass `activePassageId` to each panel
- Pass `passages` → `documents` (derived) → `SourcesPanel`
- Pass `passage` (found by activePassageId) → `ContentPanel`
- Pass narrow studio slices → `StudioPanel`
- Route upload callbacks from SourcesPanel to workspace state

**Hooks:**
- `useStudyWorkspaceState(initialPassages)` — passage CRUD + upload modal state
- `useStudioState(activePassageId)` — wraps studio coordination hooks
- `useStudyPanelLayout()` — existing

## SourcesPanel (Left) — Stateless Receiver + Self-Contained UI

**Props:**
```
documents: DocumentItem[]
activeId: string | null
onSelect: (id: string) => void        → workspace: handleSelectDocument
onOpenUploadModal: () => void          → workspace: handleOpenUploadModal
onDelete: (id: string) => void         → workspace: handleDeletePassage
collapsed?: boolean
onToggleCollapse: () => void            → layout.toggleLeft
```

**Owns (local, no side effects):**
- `searchQuery` — local filter string

**Behavior:**
- Renders "+ Add Source" button → emits `onOpenUploadModal`
- UploadModal lives at workspace level, NOT inside this panel
- No business logic, no async operations

## ContentPanel (Center) — Self-Contained Reading + Translation

**Props:**
```
passage: PassageData | null
error: string | null
```

**Owns internally:**
- `viewMode: "passage" | "pdf" | "video"` — segment toggle
- `sourceUrl: string | null` — fetched on-demand per passage
- `sourceLoading: boolean`
- `selection: TranslationSelection | null`
- `quickTranslationState: { requestId, data, status }`
- `savedVocabularyIds: Set<string>` — persisted in session only
- All translation callbacks: `handleSelectionChange`, `handleQuickTranslate`, `handleSaveVocabulary`
- `useScrollProgress(scrollRef)`

**Sub-components (self-contained):**
- `TranslationPopup` — lives here, renders when selection exists
- `PdfViewer` — loaded on-demand
- `YouTubeEmbed` — conditional render

**Emits up:**
- None — all logic is self-contained

## StudioPanel (Right) — Receives Narrow Slice + Owns Chat

**Props (narrow slices from workspace):**
```
artifacts: StudioArtifact[]                ← pre-fetched for active passage
activePassage: PassageData | null
hasActivePassage: boolean
viewingArtifact: StudioArtifact | null    ← null = show library
artifactDetailById: Record<string, ArtifactDetailCacheEntry>
onActionClick: (actionId: StudioActionId) => void
onRecordQuizResult: (artifactId, stats) => void
onResetQuizResult: (artifactId) => void
onRetryArtifact: (artifactId) => void
collapsed?: boolean
onToggleCollapse: () => void
```

**Owns internally:**
- `chatOpen: boolean` — chat overlay state
- `chatPrefill: string | null` — prefilled question
- Escape key listener for chat
- `StudioOverlay` rendering

**Emits up:**
- `onActionClick` (quiz generation trigger)
- `onRecordQuizResult`, `onResetQuizResult`, `onRetryArtifact`

**Does NOT own:**
- Artifact fetching (workspace does via `useStudioArtifacts`)
- Artifact cache (workspace owns `artifactsByPassageId`)
- Viewing artifact selection (workspace owns `viewingArtifactByPassageId`)

## Hook Responsibilities

```
useStudyWorkspaceState(initialPassages)
├── passages, activePassageId, status, error
├── isUploading, uploadingFileName
├── handleSelectDocument, handleDeletePassage
├── handleOpenUploadModal, handleCloseUploadModal
├── handleUploadStart, handleUploadComplete, handleUploadError
└── returns { activePassage } (derived)

useStudioState(activePassageId)            ← NEW wrapper
├── useStudioArtifacts(activePassageId)    ← fetch artifacts from server
├── useStudioPanelActions(activePassageId) ← handleActionClick, handleViewArtifact, etc.
└── returns { artifacts, viewingArtifact, onActionClick, ... }

useContentState()                         ← MOVED from workspace
├── viewMode, setViewMode
├── selection, quickTranslationState
├── handleSelectionChange, handleQuickTranslate, handleSaveVocabulary
└── savedVocabularyIds

useStudioPanelLayout()                    ← existing
├── leftPanelRef, rightPanelRef
├── leftPanelCollapsed, rightPanelCollapsed
├── toggleLeft, toggleRight, handleLeftResize, handleRightResize
```

## Current → Target State Migration

| Currently in Workspace | Move To |
|---|---|
| `contentViewMode`, `setContentViewMode` | `useContentState()` in ContentPanel |
| `selection`, `quickTranslationState`, `savedVocabularyIds` | `useContentState()` in ContentPanel |
| `handleSelectionChange`, `handleQuickTranslate`, `handleSaveVocabulary` | `useContentState()` in ContentPanel |
| `chatOpen`, `chatPrefill` | Already in StudioPanel — OK |
| `useStudioArtifacts` | `useStudioState()` hook |
| `useStudioPanel` | Split into `useStudioState` + `useStudioPanelActions` |

## Open Questions
1. **Upload modal position**: User said "middle of the app" — needs clarification whether this means centered on viewport (current), centered in SourcesPanel, or centered in ContentPanel.
2. **`useStudioPanel` split**: The existing hook manages both artifact cache mutations and action handlers. Needs to be split cleanly.
3. **Type file cleanup**: `@/types/study-state` was deleted — `use-studio-artifacts.ts` still imports it (broken).
