# Upload Flow

## Text Upload

```text
Client
  -> POST /api/upload/text
  -> Zod validates { text, title? }
  -> validateTextContent()
  -> getAuthenticatedUser()
  -> analyzeAndPersistContent()
  -> create Passage + Questions
  -> JSON { success, data }
```

## PDF/File Upload

```text
Client
  -> POST /api/upload multipart form with file
  -> getAuthenticatedUser()
  -> processFileUpload()
  -> validate file
  -> uploadFile() through storage adapter
  -> parsePDF() when needed
  -> analyzeAndPersistContent()
  -> create Passage + Questions + filePath
  -> JSON { success, data }
```

## Main Code Paths

| Responsibility | File |
|----------------|------|
| Text route | `src/app/api/upload/text/route.ts` |
| File route | `src/app/api/upload/route.ts` |
| File workflow | `src/features/upload/upload-workflow.ts` |
| Analysis/persistence | `src/features/upload/content-analysis-service.ts` |
| Validation | `src/contracts/upload/upload-validation.ts` |
| Storage | `src/server/storage/blob-storage.ts` |
| PDF parsing | `src/server/parsers/pdf.ts` |

## Persistence

Creates `Passage` and `Question` rows. PDF/file uploads also persist `Passage.filePath` with a storage pathname.
