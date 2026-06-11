# Page Composition Conventions

## Purpose

This document defines how pages should be composed across the app. Use it when adding a page, refactoring a page, or deciding where UI state and components belong.

## Default Composition Shape

Interactive pages should follow this hierarchy:

```text
Route page
+-- Page client
    +-- Page layout regions
        +-- Feature components
            +-- Shared UI primitives
```

Concrete file shape:

```text
src/app/[locale]/(group)/feature/page.tsx
+-- src/features/feature/feature-page-client.tsx
    +-- src/features/feature/feature-section.tsx
    +-- src/features/feature/feature-list.tsx
    +-- src/features/feature/use-feature-data.ts
    +-- src/components/ui/*
```

Feature folders may use a deeper `ui/`, `model/`, and `api/` split when the feature is large. The Study workspace is the reference example for a large feature.

## Feature Folder Convention

Use this structure for feature folders when the feature has enough code to justify the split:

```text
src/features/<feature>
+-- ui
|   +-- React components, panels, modals, rows, cards, page sections
+-- model
|   +-- feature types, state hooks, reducers, state machines, pure utilities
+-- api
|   +-- client-side API wrappers and fetch helpers
+-- actions
|   +-- server actions invoked by feature UI
+-- services
|   +-- single-feature use-case services
+-- index.ts
    +-- optional public export surface
```

Folder ownership:

| Folder | Owns | Must not own |
|--------|------|--------------|
| `ui` | React components, feature page clients, panels, modals, rows, cards, page sections. | DB access, domain services, cross-feature state, route handlers. |
| `model` | Feature types, UI state hooks, reducers, client state machines, pure utilities. | React components, server actions, fetch wrappers, repositories. |
| `api` | Client-side API wrappers, fetch helpers, browser response parsing, request builders. | Server-only DB/provider logic, reusable domain services. |
| `actions` | Server actions called from feature UI. | React state, visual rendering, reusable domain repositories. |
| `services` | Services used only by this feature/use case. | Reusable domain logic, repository/database access that should be shared outside the feature. |
| `index.ts` | Optional stable exports for external consumers. | A dumping ground for all internals. |

Rules:

- Do not create empty folders just to match the template.
- Keep small features flat until the split improves clarity.
- Use `ui/`, `model/`, `api/`, `actions/`, and `services/` once a feature has multiple files in that concern.
- Avoid feature-to-feature imports. Extract shared capability or shared domain logic first.

## Route Page Rules

`page.tsx` is the route boundary. Keep it thin.

Allowed responsibilities:

- Authenticate or redirect.
- Load server-owned data.
- Call server-side services or queries.
- Convert data into serializable props.
- Render a page client or server-only page UI.

Avoid in `page.tsx`:

- Browser state.
- Event handlers.
- Large interactive layouts.
- Client fetch policy.
- Direct visual detail for feature-heavy pages.

Example:

```text
src/app/[locale]/(dashboard)/study/page.tsx
+-- authenticate user
+-- load passages
+-- map to PassageData
+-- render StudyPageClient
```

## Page Client Rules

Use one root Client Component for each interactive page.

Naming:

- `StudyPageClient`
- `VocabularyPageClient`
- `DictionaryPageClient`
- `UploadPageClient`

Allowed responsibilities:

- Own page-level browser state.
- Compose major page regions.
- Connect feature hooks to visual sections.
- Hold page-local mutation handlers.
- Coordinate selected item, active tab, modal state, filters, pagination, and temporary loading state.

Avoid in page clients:

- Deep row/card rendering when it can be a feature component.
- Repeated API parsing logic.
- Backend ownership rules.
- Cross-page reusable data policy.

If a page client grows beyond region composition, split out feature components and hooks.

## Region And Section Rules

Major screen regions should be named by their product role, not by layout trivia.

Preferred names:

- `StudySourcesPanel`
- `StudyContentPanel`
- `StudyStudioPanel`
- `VocabularyList`
- `VocabularySetList`
- `DictionaryEntryCard`

Avoid vague names:

- `LeftPanel`
- `RightSide`
- `MainCard`
- `ContentBox`

Regions may own local UI behavior when it is scoped to that region:

- Row hover menu.
- Local search input display state.
- Collapsed rail rendering.
- Internal empty/loading/error states.

Move behavior to hooks when it affects the page as a whole, is reused, or needs focused tests.

## Hook And State Rules

Use feature hooks for reusable browser behavior and page state machines.

Good hook responsibilities:

- Fetch/refetch policy.
- Pagination and filters.
- Panel layout persistence.
- Selection geometry extraction.
- Action dispatch and optimistic state.
- Cache and stale-time handling.

Naming:

- `useStudyWorkspaceState`
- `useStudyPanelLayout`
- `useStudyActions`
- `useVocabularyList`
- `useVocabularySets`

Do not put durable domain behavior in UI hooks. Durable behavior belongs in `src/lib`.

## Service Placement Rules

Use `src/features/<feature>/services` for services that belong to a specific feature or use case.

Use `src/lib/<domain>/services` for domain services that are shared across multiple features, API routes, server actions, or background jobs.

Do not put every service into a generic `src/lib/services` folder. Services should be grouped by domain so ownership is clear.

Rules:

- If a service is used by only one feature, keep it inside that feature.
- If a service represents reusable domain/business logic, move it to `src/lib/<domain>/services`.
- If a service depends on UI state, React hooks, or page-specific behavior, it must stay in `src/features`.
- If a service performs database/domain operations that should be reused outside one feature, it belongs in `src/lib/<domain>`.
- If a service only wraps a client-side API call, put it in `src/features/<feature>/api`, not in `src/lib`.
- Repository/database access should live under `src/lib/<domain>/repositories`.

## API Boundary Rules

Use this escalation path for client data access:

```text
component-local fetch
+-- feature hook
    +-- feature client API helper
        +-- route handler or server action
            +-- feature service or src/lib domain service
```

Component-local fetch is acceptable only when:

- The call is page-specific.
- The response shape is simple.
- The parsing and error policy are not reused.

Move fetch logic into a hook or API helper when:

- Multiple components need it.
- It uses abort, debounce, cache, stale-time, retry, or dedupe policy.
- It parses stable response schemas.
- It has non-trivial URL construction.
- It has user-visible error semantics.

Route handlers and server actions must keep ownership checks, persistence rules, and provider orchestration out of UI components.

## Shared UI Rules

Use `src/components/ui` for primitives only:

- Button
- Input
- Dialog
- Dropdown menu
- Tabs
- Tooltip
- Card
- Progress

Do not put feature-specific business UI in `src/components/ui`.

Use `src/components/layout` for app shell elements:

- Dashboard sidebar.
- Auth controls.
- Theme and language controls.

Feature-specific panels, cards, rows, and forms stay under `src/features/<feature>`.

## Cross-Feature Capability Rules

Some capabilities support multiple pages but are still product-specific. Upload is the reference case.

Target upload boundary:

```text
src/features/upload
+-- ui
|   +-- upload-form.tsx
|   +-- upload-zone.tsx
|   +-- text-input-area.tsx
+-- actions
|   +-- create-uploaded-passage.action.ts
+-- model
|   +-- upload.schema.ts
|   +-- upload.types.ts
+-- services
    +-- create-uploaded-passage.ts

src/features/study
+-- ui
    +-- upload
        +-- study-upload-modal.tsx
```

Rules:

- `src/features/upload` owns the upload use case: upload form pieces, upload input validation, file/text normalization, upload-specific workflow, upload action entrypoints, and uploaded-passage creation service.
- `src/features/study/ui/upload` owns only Study-specific composition: modal shell, source picker layout, and callbacks into Study workspace state.
- Study may consume reusable upload capability, but upload capability must not import Study workspace components or Study panel state.
- Do not share by importing a page client from another feature.
- Do not make `src/features/upload` mean "the standalone upload page"; the standalone route is optional and should be a thin wrapper or disabled.
- Upload-specific business behavior should live below UI surfaces in `features/upload/actions` and `features/upload/services`.
- Reusable Passage domain behavior should live in `src/lib/passages/services` and `src/lib/passages/repositories`.

If a capability is reused by two product features, extract the reusable part before importing across feature folders. Keep feature-specific composition in the consuming feature.

Recommended upload flow:

```text
StudyUploadModal
  -> createUploadedPassageAction
    -> createUploadedPassageService
      -> createPassageService
        -> passageRepository
```

## Page Documentation Rules

Each page doc in this folder should follow this structure:

```text
# Page Name

## Route
## Purpose
## Rendering Boundary
## Layout
## State And Data
## UI States
## UI Rules
```

Small pages may omit sections that do not apply. Stub or redirect pages must say they are stubs.

Page docs should describe current implementation, not desired future behavior. Put known gaps under `Current Mismatch` or `Known Gap`.

## Decision Checklist

Before adding code, decide:

- Is this route server-only or interactive?
- What is the one root page client?
- What are the major page regions?
- Which state belongs at page level?
- Which state belongs inside one region?
- Which behavior needs a hook?
- Which API calls need a feature API helper?
- Which components are feature-specific versus shared primitives?
- What should be documented in the page doc after the change?

## Reference Examples

Study page:

```text
page.tsx
+-- StudyPageClient
    +-- StudySourcesPanel
    +-- StudyContentPanel
    +-- StudyStudioPanel
    +-- StudyUploadModal
    +-- useStudyWorkspaceState
    +-- useStudyPanelLayout
    +-- useStudyActions
```

Vocabulary page:

```text
page.tsx
+-- VocabularyPageClient
    +-- VocabularyList
    +-- VocabularySetList
    +-- PageTabButton
    +-- PageErrorState
    +-- useVocabularyList
    +-- useVocabularySets
```
