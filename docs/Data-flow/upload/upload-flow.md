# Upload Feature Data Flow

## Overview

Technical architecture for the upload feature. Covers server actions, Inngest processing, and database operations.

**Related:** [Passage Render When Upload](./passage-render-when-upload.md) - UI rendering flow.

---

## 1. Overall Data Flow (Event-Driven)

```mermaid
flowchart TD
    A[User selects file] --> B[validateFile client]
    B --> C{Valid?}
    C -->|No| D[Show error]
    C -->|Yes| E[Call uploadFileAction]
    E --> F[Server Action]
    F --> G[Create UploadJob]
    G --> H[Send Inngest event]
    H --> I[Return jobId to UI]
    I --> J[UI polls status]

    K[Inngest processes async] --> L[Update job status to PROCESSING]
    L --> M[Detect CEFR level]
    M --> N[Create Passage]
    N --> O[Update job status to DONE]

    J --> P{Poll status}
    P -->|PENDING/PROCESSING| Q[Show progress]
    P -->|DONE| R[Passage ready]
    P -->|FAILED| S[Show error]

    Q --> P
    style D fill:#ff6b6b,color:#fff
    style S fill:#ff6b6b,color:#fff
    style R fill:#51cf66,color:#fff
```

---

## 2. Upload Sequence

```mermaid
sequenceDiagram
    participant U as UI
    participant A as Server Action
    participant J as UploadJob (DB)
    participant I as Inngest
    participant F as Inngest Function

    U->>U: validateFile(file)
    U->>A: uploadFileAction({passageId, title, text, sourceType, startedAt})
    A->>J: prisma.uploadJob.create({status: PENDING})
    J-->>A: job created
    A->>I: inngest.send({name: "upload/process", data: {...}})
    I-->>A: event sent
    A-->>U: {success: true, data: {jobId}}
    U->>U: start polling getUploadStatus(jobId)

    Note over I,F: Async processing
    I->>F: trigger "upload/process" event
    F->>J: update status to PROCESSING
    F->>F: detect CEFR level (TODO: AI)
    F->>F: create passage with passageId
    F->>J: update status to DONE, passageId

    U->>J: getUploadStatus(jobId)
    J-->>U: status: DONE, passageId, passage
```

---

## 3. Inngest Function Processing

```mermaid
sequenceDiagram
    participant I as Inngest
    participant S as Step Functions
    participant P as Prisma

    I->>S: trigger upload/process
    S->>P: update job status to PROCESSING

    S->>S: detect CEFR level
    Note over S: TODO: Implement with AI

    S->>P: create passage (using client-provided passageId)
    P-->>S: passage created

    S->>P: update job to DONE, passageId
    S-->>I: return {jobId, passageId, cefrLevel}
```

---

## 4. Job Status Polling

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> PROCESSING: Inngest processes
    PROCESSING --> DONE: Success
    PROCESSING --> FAILED: Error
    PENDING --> FAILED: Error
```

---

## Layer Responsibilities

| Layer | File | Responsibility |
|-------|------|----------------|
| UI | `upload-modal.tsx` | User interaction, file selection |
| Hook | `use-upload-submit.ts` | Client UUID, polling, callbacks |
| Action | `actions.ts` | Create job, send event |
| Queue | `inngest/client.ts` | Event definitions |
| Worker | `process-upload.ts` | Background processing |
| Database | `prisma/uploadJob` | Job status tracking |

---

## API Contracts

### uploadFileAction Input
```typescript
{
  passageId: string,        // Client-generated UUID
  title: string,
  text: string,
  sourceType: "paste" | "txt" | "pdf" | "youtube",
  startedAt: number,        // Client timestamp for ordering
  blobPath?: string
}
```

### uploadFileAction Response
```typescript
{ success: true, data: { jobId: string } }
```

### getUploadStatus Response
```typescript
{
  success: true,
  data: {
    status: "PENDING" | "PROCESSING" | "DONE" | "FAILED",
    passageId?: string,
    passage?: PassageData,   // Included when DONE
    error?: string
  }
}
```

---

## Error Handling

| Stage | Error | UI Response |
|-------|-------|-------------|
| Upload | Invalid file | Show validation error |
| Create Job | DB error | Show error toast |
| Send Event | Inngest error | Show error toast |
| Poll Status | Job not found | Show error |
| Inngest Processing | Exception | Update job to FAILED |
