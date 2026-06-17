# Upload Page

## Route

Route:

`/[locale]/upload`

Route file:

`src/app/[locale]/(dashboard)/upload/page.tsx`

Current root client:

`src/features/upload/ui/upload-page-client.tsx`

## Purpose

Transitional standalone content ingestion page for uploading a file or pasting text.

Target direction:

- Keep upload as a shared capability under `src/features/upload`.
- Remove or disable the standalone `/upload` page as a primary product route.
- Route users to the Study workspace for source creation.
- If `/upload` remains, make it a thin wrapper around the shared upload capability and redirect successful uploads into `/study`.

The current implementation predates this boundary and still behaves as a standalone upload page.

## Target Feature Boundary

Proposed upload feature shape:

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
```

Study-specific upload composition should live separately:

```text
src/features/study
+-- ui
    +-- upload
        +-- study-upload-modal.tsx
```

Boundary rules:

- `features/upload/ui` owns reusable upload form pieces.
- `features/upload/actions` owns upload mutation entrypoints, including `createUploadedPassageAction`.
- `features/upload/model` owns upload schemas and types.
- `features/upload/services` owns upload-specific workflow, including `createUploadedPassageService`.
- `features/study/ui/upload` owns the modal shell and Study workspace callbacks only.
- `src/server/modules` owns reusable Passage domain services, including `createPassageService`.
- `src/server/db` owns passage repository/database access.
- `features/upload` must not import Study workspace UI or Study panel state.

Recommended flow:

```text
StudyUploadModal
  -> createUploadedPassageAction
    -> createUploadedPassageService
      -> createPassageService
        -> passageRepository
```

Service placement:

- Keep upload input validation, file/text normalization, and upload-specific workflow in `features/upload`.
- Move reusable passage creation, reads, ownership checks, and repository access to `src/server/modules`.
- If a service only wraps a client-side API call, put it in `features/upload/api-client`, not in `src/server/modules`.

## Layout

```text
UploadPageClient
+-- Header
|   +-- Title
|   +-- Description
+-- Main content
    +-- Upload method buttons
    +-- UploadZone or TextInputArea
```

The page uses a muted full-height background, a surface header, and a centered `max-w-4xl` content column.

## Interaction Contract

Upload methods:

- `file`: renders `UploadZone`.
- `text`: renders `TextInputArea`.

File upload:

- Builds `FormData`.
- Posts to `/api/upload`.
- Parses with `uploadResponseSchema`.
- On success, routes to `/study`.

Text upload:

- Posts JSON to `/api/upload/text`.
- Parses with `uploadResponseSchema`.
- On success, routes to `/study`.

Both methods:

- Set `isProcessing` while running.
- Disable controls while processing.
- Record Sentry breadcrumbs for schema errors.
- Use browser alerts for failures.

## Current Mismatch

The standalone page duplicates upload concerns with `src/features/study/ui/upload-modal.tsx`. New work should move toward the target boundary above instead of adding more upload behavior to both places.

## UI Rules

- Keep upload method selection as a compact segmented pair or equivalent tabs.
- `UploadZone` and `TextInputArea` own their detailed input states.
- Do not add study-reader UI here; successful ingestion should hand off to a reading or study workspace.
- Do not treat `UploadPageClient` as the canonical owner of upload behavior.
