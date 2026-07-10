# New Upload Workflow (Proposed)

## Overview

Upload tạo passage + detect CEFR level. Không sinh câu hỏi trong quá trình upload.

**Start:** User selects a file on the UI component.
**End:** UI displays success với passageId + metadata.

---

## 1. Overall Data Flow

```mermaid
flowchart TD
    A[User selects file] --> B[validateFile client]
    B --> C{Valid?}
    C -->|No| D[Show error]
    C -->|Yes| E[Call uploadFileAction]
    E --> F[Server Action]
    F --> G[Upload Service]
    G --> H[Storage Service]
    H --> I[Extract text]
    I --> J[Detect CEFR Level]
    J --> K[Persist Passage]
    K --> L[Repository]
    L --> M[Database]
    M --> N[Return to UI]
    N --> O[UI shows success]
    J -.->|Error| P[Delete file]
    P -.-> Q[Show error]
    D --> Q
    style D fill:#ff6b6b,color:#fff
    style P fill:#ff6b6b,color:#fff
    style O fill:#51cf66,color:#fff
```

---

## 2. Upload Sequence

```mermaid
sequenceDiagram
    participant U as UI
    participant A as Server Action
    participant W as Upload Service
    participant S as Storage
    participant C as CEFR Detection

    U->>U: validateFile(file)
    U->>A: uploadFileAction(file)
    A->>W: processFileUpload(userId, file)
    W->>W: validateFile server
    W->>W: sanitizeFilename
    W->>S: uploadFile(filename, buffer)
    S-->>W: {pathname, url}
    W->>W: extractText(file, buffer)
    W->>C: detectCEFRLevel(text)
    C-->>W: cefrLevel
    W->>W: createPassage({text, cefrLevel, ...})
    W-->>A: {passageId, cefrLevel, wordCount}
    A-->>U: {success, data}
```

---

## 3. Text Extraction Logic

| File Type | Method |
|-----------|--------|
| `.txt` | `buffer.toString("utf-8")` |
| `.pdf` | `parsePDF(buffer)` |

---

## 4. Persist and Rollback

```mermaid
sequenceDiagram
    participant W as Upload Service
    participant S as Storage
    participant R as Repository
    participant D as Database

    W->>S: uploadFile
    S-->>W: success
    W->>W: storedInStorage = true

    Note over W: Error occurs

    alt storedInStorage
        W->>S: deleteFile(filename)
        S-->>W: deleted
    end

    W->>W: throw error
```

```typescript
try {
  const result = await uploadFile(filename, buffer);
  storedInStorage = true;
  const passage = await createPassage({...});
  return passage;
} catch (error) {
  if (storedInStorage) await deleteFile(filename);
  throw error;
}
```

---

## 5. Quiz Generation (Separate Flow - Studio)

Question generation KHÔNG xảy ra trong upload. Learner chủ động trigger từ Studio button.

```mermaid
flowchart LR
    A[Passage] --> B[Studio Button]
    B --> C[Generate Questions]
    C --> D[AI Service]
    D --> E[Create Questions]
    E --> F[StudioArtifact + Questions]
```

---

## Response Envelope

```typescript
// Success
{ success: true, data: { passageId, cefrLevel, wordCount } }

// Error
throw new UploadWorkflowError(message, status)
```

### Response Schema (upload.schema.ts)

```typescript
export const uploadResultSchema = z.object({
  passageId: z.string(),
  cefrLevel: z.string(),
  wordCount: z.number(),  // THAY ĐỔI: thay questionCount bằng wordCount
}).strict();
```

---

## Files to Update

| File | Action | Changes |
|------|--------|---------|
| `docs/Data-flow/upload-flow.md` | UPDATE | Remove questionCount, update flow |
| `docs/Requirements/software-requirements.md` | UPDATE | FR-03 mark as Deferred/Studio |
| `src/features/upload/schemas/upload.schema.ts` | UPDATE | schema trả về wordCount thay vì questionCount |
| `src/features/upload/services/content-analysis.service.ts` | NO CHANGE | hiện hardcode B2, CEFR AI sau |

---

## Notes

- CEFR Detection: hiện hardcode B2. AI detection (FR-02) sẽ implement sau.
- Question Generation (FR-03): deferred. Studio button sẽ gọi separate AI flow.
- Upload workflow chỉ tạo Passage record, không tạo Questions hay StudioArtifact.
