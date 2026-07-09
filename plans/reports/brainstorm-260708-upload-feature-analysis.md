---
name: upload-feature-analysis
description: Analysis of src/features/upload/ — component flow, background logic, and utilities
metadata:
  type: report
---

# Upload Feature: Comprehensive Analysis

## Summary

The upload feature handles file (PDF/TXT) and text paste inputs, extracts content, detects CEFR level, and persists passages. After the simplification removal, the pipeline is streamlined: upload → extract → persist → display. Quiz generation moved to on-demand studio action.

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
| `services/content-analysis.service.ts` | Core analysis: extracts text, sets placeholder CEFR level, persists Passage |
| `services/upload-service.ts` | Client-side wrapper calling server actions + Sentry breadcrumbs |
| `ui/pages/processing-page.tsx` | Full-screen animated spinner (animation updated, simplifying stage removed) |
| `ui/pages/upload-page.tsx` | `UploadPageClient` — tab switcher (file vs. text) |
| `ui/sources-panel.tsx` | `StudySourcesPanel` — document list sidebar for study workspace |
| `ui/text-input-area.tsx` | Textarea with word-count footer + validation errors |
| `ui/upload-modal.tsx` | `StudyUploadModal` — modal overlay for study workspace |
| `ui/upload-zone.tsx` | Drag-and-drop zone via `react-dropzone` |

---

## 2. Current Pipeline

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
  └─ createPassageWithArtifacts() [Prisma — single transaction]
        → Passage (with cefrLevel, no simplified fields)

[Client] toPassageData() → PassageData DTO
  ↓
useStudyWorkspaceState
  ├─ applyOptimistic: passages.push(newPassage)
  ├─ activePassageId = newPassage.id
  └─ router.refresh() → RSC re-fetch
```

**Quiz generation** moved to `src/features/passage/services/passage-study.service.ts` — on-demand via `generateStudioQuestionsAction`.

---

## 3. Database Model (Prisma)

```prisma
model Passage {
  id          String    @id @default(dbgenerated("gen_random_uuid()"))
  userId      String
  title       String
  content     String    // Extracted text used for quiz generation
  cefrLevel   CEFRLevel? // CEFR level of content
  wordCount   Int
  sourceType  SourceType // TEXT | PDF | URL | YOUTUBE
  filePath    String?    // Blob pathname (PDF), embed URL (YouTube)
  // Removed: simplifiedContent, simplifiedLevel
}
```

---

## 4. Key Changes (2026-07-08)

| Change | Files Modified |
|--------|--------------|
| Removed simplification from pipeline | `content-analysis.service.ts`, `upload-workflow.ts`, `content-analysis.repository.ts` |
| Deleted content-simplifier.ts | `src/services/ai/content-simplifier.ts` |
| Renamed `originalLevel` → `cefrLevel` | All upload/reading files, Prisma schema |
| Toggle: Original/Simplified → Source/Passage | `content-panel.tsx`, `study-workspace.tsx`, messages |
| Removed level from settings | `settings-modal.tsx` |
| Fixed local storage fallback | `storage.ts` — uses local when no BLOB_TOKEN |
| Added i18n keys | `en.json`, `vi.json` — `source`, `passage` |

---

## 5. Cross-Cutting Dependencies

| Feature | Used by | What |
|---------|---------|------|
| `@/services/storage` | `upload-workflow.ts` | `uploadFile`, `deleteFile` |
| `@/lib/prisma` | `content-analysis.repository.ts` | `prisma` client |
| `@/features/passage/schemas/passage.schema` | `upload-modal.tsx` | `PassageData`, `SourceType` |
| `@/types/cefr` | `content-analysis.service.ts` | `CEFRLevel` type |

---

## 6. UI Components

### Content Panel Toggle
- **Left**: Passage (extracted text) — default view
- **Right**: Source (PDF blob / YouTube embed placeholder)
- **Meta bar**: CEFR badge + word count

### Settings Modal
- Target level selector **removed**
- Level section deleted entirely

---

## 7. Storage

Fixed dual-adapter storage:
- **Local dev**: Falls back to `.local-blob-storage/` when `BLOB_READ_WRITE_TOKEN` is not set
- **Vercel**: Uses `@vercel/blob` when token is configured

---

## 8. Notes

- `cefrLevel` is currently hardcoded to `"B2"` — needs AI CEFR detection (UC-2A step 5)
- Quiz generation is now **on-demand** in studio (UC-3b), not during upload
- Source view rendering (PDF blob, YouTube embed) is a placeholder — actual implementation pending
