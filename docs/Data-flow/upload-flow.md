# Upload Feature Data Flow

## Overview

Start: User selects a file on the UI component.
End: UI displays the result (success -> new passage/quiz, or error -> error state).
The data flow always closes at the UI layer because that is where the user sees the system state change.

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
    I --> J[Analyze and Persist]
    J --> K[Repository]
    K --> L[Database]
    L --> M[Return to UI]
    M --> N[UI shows success]
    J -.->|Error| O[Delete file]
    O -.-> P[Show error]
    D --> P
    style D fill:#ff6b6b,color:#fff
    style P fill:#ff6b6b,color:#fff
    style N fill:#51cf66,color:#fff
```

---

## 2. Upload Sequence

```mermaid
sequenceDiagram
    participant U as UI
    participant A as Server Action
    participant W as Upload Service
    participant S as Storage

    U->>U: validateFile(file)
    U->>A: uploadFileAction(file)
    A->>W: processFileUpload(userId, file)
    W->>W: validateFile server
    W->>W: sanitizeFilename
    W->>S: uploadFile(filename, buffer)
    S-->>W: {pathname, url}
    W-->>A: {filePath}
    A-->>U: {success, data}
```

---

## 3. Extract and Analyze

```mermaid
sequenceDiagram
    participant W as Upload Service
    participant P as PDF Parser
    participant V as Validation
    participant A as Content Analysis

    W->>W: extractText(file, buffer)

    alt txt file
        W->>W: buffer.toString("utf-8")
    end

    alt pdf file
        W->>P: parsePDF(buffer)
        P-->>W: {text}
    end

    W->>V: validateTextContent(text)
    V-->>W: {valid}
    W->>A: analyzeAndPersistContent({text, ...})
    A-->>W: {passageId, cefrLevel}
```

### Text Extraction Logic

| File Type | Method |
|-----------|--------|
| `.txt` | `buffer.toString("utf-8")` |
| `.pdf` | `parsePDF(buffer)` |

---

## 4. Persist and Rollback

```mermaid
sequenceDiagram
    participant A as Content Analysis
    participant R as Repository
    participant D as Database
    participant W as Service
    participant S as Storage

    A->>R: createPassageWithArtifacts({...})
    R->>D: prisma.passage.create
    D-->>R: {passage}
    R-->>A: {passage}
    A-->>W: {passageId, cefrLevel}
    W-->>A: Return to caller
```

### Error Rollback

```mermaid
sequenceDiagram
    participant W as Service
    participant S as Storage

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
  const analysis = await analyzeAndPersistContent({...});
  return analysis;
} catch (error) {
  if (storedInStorage) await deleteFile(filename);
  throw error;
}
```

---

## File Structure

```
src/features/upload/
├── actions.ts                     # Server Action entry point
├── services/
│   ├── upload-service.ts       # Business logic
│   └── content-analysis.service.ts
├── db/
│   └── content-analysis.repository.ts  # Prisma only
├── hooks/
│   └── use-upload-submit.ts
├── ui/
│   └── upload-modal.tsx
├── lib/
│   ├── upload-validation.ts
│   └── parsers/pdf.ts
└── schemas/
    └── upload.schema.ts
```

## Layer Responsibilities

| Layer | File | Responsibility |
|-------|------|----------------|
| UI | `upload-modal.tsx` | User interaction, error display |
| Action | `actions.ts` | Server action, validation |
| Service | `upload-service.ts` | Orchestration, rollback |
| Analysis | `content-analysis.service.ts` | Text analysis |
| Repository | `content-analysis.repository.ts` | Prisma operations |
| Storage | `@/services/storage` | File storage |

## Response Envelope

```typescript
// Success
{ success: true, data: { passageId, cefrLevel } }

// Error
throw new UploadServiceError(message, status)
```

## Data Flow Closure at UI

```
User Action -> [Server Processing] -> UI Response -> User Sees Result
     ^                                              |
     -------------------------------------------------
                    (Closure)
```
