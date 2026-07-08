---
name: upload-feature-analysis
description: Comprehensive analysis of src/features/upload/ — component flow, background logic, and utilities
metadata:
  type: report
---

# Upload Feature: Comprehensive Analysis

## Summary

The upload feature handles two input modes — file (PDF/TXT) and text paste — runs AI analysis (CEFR detection, simplification, quiz generation), persists everything to PostgreSQL via Prisma, and surfaces results in the `/study` workspace. Three notable gaps exist: the `/processing` page is decoupled from real state, `FileUploadIntent` model is defined but unused, and two separate entry points share similar logic with minor divergence.

---

## 1. File Inventory

| Path | Role |
|------|------|
| `actions.ts` | Server Actions — `uploadFileAction`, `uploadTextAction` |
| `db/content-analysis/content-analysis.repository.ts` | Prisma write: `createPassageWithArtifacts` |
| `db/upload-workflow.ts` | Orchestration: `processFileUpload` — validate, store, parse, dispatch |
| `hooks/use-upload-submit.ts` | Client hook wrapping file/text submission + router navigation |
| `lib/parsers/pdf.ts` | PDF text extraction via `pdf-parse` |
| `lib/upload-validation.ts` | All validators: file size/type, text length, filename/title sanitization, format helpers |
| `schemas/upload.schema.ts` | Zod schema: `uploadResultSchema` / `UploadResultDto` |
| `services/content-analysis.service.ts` | Core analysis: CEFR heuristic, AI simplification, AI question generation, DB write |
| `services/upload-service.ts` | Client-side wrapper calling server actions + Sentry breadcrumbs |
| `ui/pages/processing-page.tsx` | Full-screen animated spinner (auto-redirects `/study` after 6s) |
| `ui/pages/upload-page.tsx` | `UploadPageClient` — tab switcher (file vs. text) |
| `ui/sources-panel.tsx` | `StudySourcesPanel` — document list sidebar for study workspace |
| `ui/text-input-area.tsx` | Textarea with word-count footer + validation errors |
| `ui/upload-modal.tsx` | `StudyUploadModal` — modal overlay for study workspace |
| `ui/upload-zone.tsx` | Drag-and-drop zone via `react-dropzone` |

---

## 2. Component Hierarchy

```
/study page (RSC)
└── StudyPageClient
    ├── StudySourcesPanel
    │     ├── StreamingUploadRow (inline)
    │     └── SourceRow (inline)
    ├── StudyContentPanel
    ├── StudyStudioPanel
    └── StudyUploadModal          ← modal entry point in study workspace
          ├── InputMode: null → drag-drop + source buttons
          │               → file mode (dropzone)
          │               → text mode (textarea + submit)
          └── InputMode: "file" | "text"

/upload page (RSC)
└── UploadPageClient              ← standalone page entry point
    ├── UploadZone (drag-drop)
    └── TextInputArea (textarea)

/processing page (RSC)
└── ProcessingPageClient
    └── ProcessingPageContent     ← spinner only, no real state

DashboardSidebar (layout shell for all)
```

**Critical**: `StudyUploadModal` is always mounted in `/study` (driven by `useStudyWorkspaceState`). Standalone `/upload` uses `useUploadSubmit` hook with different routing (navigates to `/study` on success).

---

## 3. Server Actions / Background Logic

### Upload pipeline

```
Client: UploadZone / StudyUploadModal
  ↓ onFileSelect / handleTextSubmit
useUploadSubmit hook (router.push "/study" on success)
  ↓ uploadFile() / uploadText()
upload-service.ts (client wrapper)
  ↓ uploadFileAction / uploadTextAction  [SERVER ACTION]
processFileUpload() or analyzeAndPersistContent()
  ├─ validateFile() / validateTextContent()
  ├─ sanitizeFilename() / sanitizeTitle()
  ├─ uploadFile() → storage adapter (Vercel Blob or local fs)
  ├─ parsePDF() if PDF
  ├─ validateTextContent() on extracted text
  ├─ getHeuristicCEFR() → originalLevel
  │     └─ isSimplifiableCEFRLevel() + getTargetCEFRLevel()
  │           └─ simplifyContent() [AI — gpt-4o-mini, optional, skipped for A1/A2]
  ├─ generateComprehensionQuestions() [AI — gpt-4o-mini]
  └─ createPassageWithArtifacts() [Prisma — single transaction]
        ├─ Passage
        ├─ StudioArtifact (type=quiz, status=done)
        └─ Question[] (5 questions)

  ↓
[Client] toPassageData() → PassageData DTO
  ↓
useStudyWorkspaceState
  ├─ applyOptimistic: passages.push(newPassage)
  ├─ activePassageId = newPassage.id
  ├─ router.refresh() → RSC re-fetch
  └─ documents[] updated → SourcesPanel re-renders
```

### AI services
- `simplifyContent()` from `src/services/ai/content-simplifier.ts` — `gpt-4o-mini` via Vercel AI SDK (`generateObject`), maps original CEFR to target (C2→C1, C1→B2, etc.)
- `generateComprehensionQuestions()` from `src/services/ai/question-generator.ts` — `gpt-4o-mini`, produces 5 MCQs with line citations
- Both instrumented with Sentry spans (`ai:content-simplify`, `ai:question-gen`), wrapped in `server-only`

### Storage
Dual-adapter in `src/services/storage.ts`: local dev uses `node:fs/promises` (`.local-blob-storage/`), Vercel uses `@vercel/blob`. Both implement `upload`, `delete`, `getSignedUrl`.

---

## 4. Database Layer

| Model | Role |
|-------|------|
| `Passage` | Core entity: raw text, simplified text, CEFR levels, word count, source type, file path |
| `Question` | Nested under Passage: questionText, options (JSON), correctOption, sourceText, sourceLine, explanation, questionType, difficulty |
| `StudioArtifact` | Nested under Passage: initial quiz artifact with status `done` |
| `FileUploadIntent` | **Defined but unused** — planned for signed-URL direct upload (client → blob), not yet wired |
| `UserProfile` | Related via `userId` on Passage and FileUploadIntent |

Repository: `createPassageWithArtifacts` in `db/content-analysis/` uses a single Prisma transaction to create `Passage` + `StudioArtifact` + `Question[]` atomically.

---

## 5. Utilities

### `lib/upload-validation.ts`
- `validateFile(file)` — max 10MB, MIME types `text/plain` / `application/pdf`, or extensions `.txt` / `.pdf`
- `validateTextContent(text)` — trimmed length 50–100,000 chars
- `sanitizeFilename(name)` — strips non-alphanumeric, blocks `..` and leading slashes, max 100 chars
- `sanitizeTitle(name)` — removes extension, strips special chars, collapses `_-`, max 200 chars, defaults to "Untitled"
- `formatFileSize(bytes)` — human-readable (Bytes/KB/MB/GB)
- Constants: `MAX_FILE_SIZE` = 10MB, `ALLOWED_TEXT_TYPES`, `ALLOWED_PDF_TYPES`

### `lib/parsers/pdf.ts`
- `parsePDF(buffer)` — wraps `pdf-parse`, cleans form-feeds/whitespace, returns `{ text, pages, metadata }`
- `extractTitleFromPDF(pdf, filename)` — prefers PDF metadata title, then first short line, else sanitized filename

---

## 6. Cross-Cutting Dependencies

| External feature | Used by | What is used |
|-----------------|---------|-------------|
| `@/services/clerk` | `actions.ts` | `getUserId()` |
| `@/services/storage` | `upload-workflow.ts` | `uploadFile`, `deleteFile` |
| `@/services/ai/question-generator` | `content-analysis.service.ts` | `generateComprehensionQuestions`, `GeneratedQuestion` type |
| `@/services/ai/content-simplifier` | `content-analysis.service.ts` | `simplifyContent` |
| `@/lib/logger` | `content-analysis.service.ts`, `storage.ts` | `createModuleLogger` |
| `@/types/cefr` | `content-analysis.service.ts`, `content-analysis.repository.ts` | `CEFRLevel`, `getHeuristicCEFR`, `getTargetCEFRLevel`, `isSimplifiableCEFRLevel` |
| `@/lib/prisma` | `content-analysis.repository.ts` | `prisma` client |
| `@/features/passage/schemas/passage.schema` | `upload-modal.tsx` | `PassageData`, `SourceType`, `toPassageData()` |
| `@/features/studio-panel/actions` | `use-study-workspace-state.ts` | artifact cache types |

---

## 7. App Router Entries

| Route | File | Notes |
|-------|------|-------|
| `/upload` | `src/app/[locale]/(dashboard)/upload/page.tsx` | RSC wrapper → `UploadPageClient` |
| `/processing` | `src/app/[locale]/(dashboard)/processing/page.tsx` | RSC wrapper → `ProcessingPageClient` — spinner only |
| `/study` | `src/app/[locale]/(dashboard)/study/` | Main workspace: `StudyPageClient` + `StudySourcesPanel` + `StudyUploadModal` |
| `/` | `src/app/[locale]/page.tsx` | Dashboard with passage links to `/study` |

---

## 8. Notable Gaps

1. **`/processing` page is disconnected from real state.** It animates a spinner via hardcoded `setInterval` — never receives actual processing state from the server action. Upload redirects directly to `/study` without visiting `/processing`.

2. **`FileUploadIntent` Prisma model is defined but unused.** Intended for signed-URL direct upload (client → blob with pre-authorized intent), but current code streams the full file through the server action. Likely a planned future optimization.

3. **Dual entry points with divergent hooks.** `StudyUploadModal` (in `/study`) and `UploadPageClient` (at `/upload`) implement the same upload logic but use different hooks (`useStudyWorkspaceState` vs. `useUploadSubmit`). The standalone page navigates to `/study` on success; the modal stays in the workspace.

4. **AI calls truncate to 10,000 chars.** Both `analyzeAndPersistContent` and `generateQuestionsForContent` slice text before sending to OpenAI, but the full text is stored in `Passage.content`.

---

## Unresolved Questions

- Should the `/processing` page be wired to real processing state, or deprecated in favor of inline `/study` feedback?
- Is `FileUploadIntent` still part of the roadmap, or safe to remove?
- Should `StudyUploadModal` and `UploadPageClient` share a single hook to avoid divergence?
