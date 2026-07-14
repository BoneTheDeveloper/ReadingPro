# Upload Feature — Logic & Service Data Flow

> **Doc scope:** This is the **current implementation** document.
> For the target architecture and future roadmap, see [Upload AI Architecture](./upload-ai-architecture.md).
> For UI rendering flow, see [Upload Render Flow](./upload-render-flow.md).

## Overview

Server-side logic for the upload feature: the server action, the Inngest event
queue, the background worker, and the `UploadJob` lifecycle in the database.

---

## Service Components

| Layer | File | Responsibility |
|-------|------|----------------|
| Action | `src/features/upload/actions.ts` | Auth, create `UploadJob`, persist raw file (files only), emit event, expose status |
| Storage | `src/services/storage.ts` | `uploadFile` (action) + `downloadFile` (worker) — local FS in dev, Vercel Blob in prod |
| Queue | `src/services/inngest/client.ts` | Inngest client + `upload/process` event schema (source descriptor) |
| Worker | `src/services/inngest/functions/process-upload.ts` | Async job: resolve+parse text → detect CEFR → create passage → mark done |
| Parser | `src/features/upload/lib/pdf-parsers.ts` | `parsePDF` — invoked by the worker for `pdf` uploads |
| Database | `prisma.uploadJob` / `prisma.passage` | Job status tracking + persisted passage (called directly from the worker) |
| Mapper | `src/types/passage.ts` | `toPassageData` — Prisma row → DTO at read boundary (shared model) |

**Parsing lives in the worker.** The action carries only a lightweight source
descriptor; the worker resolves the passage text from it. This keeps a
crash-prone parse (malformed PDF) inside the retryable job — a failure becomes a
`FAILED` job, never a crashed action/client. Blob storage is a **conditional
side effect**: only file uploads (`txt`/`pdf`) persist a raw file; `paste`
(and future `youtube`) skip storage entirely and the flow still runs.

Text resolution by `sourceType` (`resolve-text` step):

| `sourceType` | Event carries | Blob? | Worker resolves text via |
|--------------|---------------|-------|--------------------------|
| `paste`  | `text` (inline) | ❌ | uses `text` directly |
| `txt`    | `blobPath`      | ✅ | `downloadFile` → utf-8 |
| `pdf`    | `blobPath`      | ✅ | `downloadFile` → `parsePDF().text` |
| `youtube`| `url`           | ❌ | fetch transcript (TODO, not implemented) |

> Upload creates a **passage only** — it does not generate questions. Question
> generation is a separate, on-demand study feature (`src/features/passage/`).

Two distinct identifiers flow through the system:

- **`jobId`** — server-generated, format `upload_${Date.now()}_${random}`.
  Tracks the processing job.
- **`passageId`** — client-generated UUID, passed in from the UI. Used as the
  Prisma `Passage.id` so the client key stays stable across the temp→real swap
  (see render flow).

---

## 1. Server Logic Flow (Event-Driven)

The action returns as soon as the job is queued; the worker does the real work
asynchronously and the client polls `getUploadStatus` for the result.

```mermaid
flowchart TD
    A[uploadFileAction input] --> B[Validate with zod schema]
    B --> C[getUserId auth]
    C --> D[Generate jobId]
    D --> E[prisma.uploadJob.create status PENDING]
    E --> F[inngest.send upload/process]
    F --> G[Return jobId]

    H[Inngest triggers worker] --> I[Update job to PROCESSING]
    I --> R[resolve-text by sourceType: downloadFile + parsePDF]
    R --> J[Detect CEFR level - TODO AI]
    J --> K[Create Passage with client passageId]
    K --> L[Update job to DONE + passageId]

    M[getUploadStatus jobId] --> N{Job status}
    N -->|DONE| O[Fetch passage, map via toPassageData]
    N -->|PENDING/PROCESSING| P[Return status only]
    N -->|FAILED| Q[Return error]

    style Q fill:#ff6b6b,color:#fff
    style O fill:#51cf66,color:#fff
```

---

## 2. Server Action Sequence

Two actions split by transport. Both are thin — neither parses.

- `uploadTextAction(input)` — paste: validate, auth, create job, emit event with
  inline `text`. No storage.
- `uploadFileAction(formData)` — `txt`/`pdf`: **job-first** ordering so a blob
  write failure surfaces as `FAILED` (not a silent disruption). The raw file is
  the only synchronous side effect; all parsing is deferred to the worker.

```mermaid
sequenceDiagram
    participant A as uploadFileAction
    participant Auth as getUserId
    participant J as UploadJob (DB)
    participant S as Storage (uploadFile)
    participant I as Inngest

    A->>A: validateFile(file) + parse fields
    A->>Auth: getUserId()
    Auth-->>A: userId
    A->>A: jobId, blobPath = uploads/{userId}/{passageId}.{ext}
    A->>J: create({ id: jobId, status: PENDING, sourceType, blobPath })
    Note over A,J: job exists BEFORE any fallible IO
    A->>S: uploadFile(blobPath, bytes)
    alt store fails
        S-->>A: null / throw
        A->>J: update({ status: FAILED, error })
        A-->>A: return { jobId }  (client polls → FAILED)
    else store ok
        S-->>A: stored
        A->>I: inngest.send({ jobId, userId, blobPath, sourceType, title, passageId, startedAt })
        A-->>A: return { jobId }
    end
```

---

## 3. Inngest Worker Processing

`process-upload.ts` runs the job in ordered, retryable `step.run` blocks. Any
thrown error is caught by `failJob`, which marks the job `FAILED` and re-throws.

**Step design rationale:**
- `resolve-text` = I/O (file download) — retry is cheap, isolated
- `analyze-content` = AI call — retry is expensive, separated from resolve
- `normalizeText` = pure function, no step needed — runs inside analyze-content step

```mermaid
sequenceDiagram
    participant I as Inngest
    participant S as Step Functions
    participant P as Prisma

    I->>S: trigger upload/process
    S->>P: step "update-job-status-to-processing" → status PROCESSING

    S->>S: step "resolve-text" → downloadFile + parsePDF (I/O)
    Note over S: empty → throw → FAILED

    S->>S: step "analyze-content" → normalize + analyze (AI)
    Note over S: placeholder returns "B2", [], []

    S->>P: step "create-passage"
    P-->>S: passage created

    S->>P: step "update-job-status-to-done" → status DONE
    S-->>I: return { jobId, passageId, cefrLevel }

    Note over S,P: On throw → failJob() → status FAILED
```

**Worker steps (5 total):**

| Step | Type | Retry Cost | Purpose |
|------|------|-----------|---------|
| `update-job-status-to-processing` | DB write | Low | Status update |
| `resolve-text` | I/O | Low | Download + parse file |
| `analyze-content` | CPU/AI | High | Normalize + analyze |
| `create-passage` | DB write | Low | Persist passage |
| `update-job-status-to-done` | DB write | Low | Final status |

### Service Layer

Processing logic organized into services under `src/features/upload/services/`:

| Service | Purpose |
|---------|---------|
| `upload-processor.ts` | Individual pipeline functions |
| `inngest/events.ts` | Event schemas (upload-specific) |
| `normalizers/text-normalizer.ts` | Text normalization |
| `normalizers/pdf-normalizer.ts` | PDF cleanup |
| `analyzers/cefr-detector.ts` | CEFR — placeholder `"B2"` |
| `analyzers/vocabulary-extractor.ts` | Vocabulary — placeholder `[]` |
| `analyzers/topic-tagger.ts` | Topics — placeholder `[]` |

**Step → Service mapping:**

| Step | Service Function |
|------|------------------|
| `resolve-text` | Inline in worker (I/O) |
| `analyze-content` | `normalizeTextPipeline` + `analyzeContent` |
| `create-passage` | Direct Prisma |
| `normalizers/pdf-normalizer.ts` | PDF-specific cleanup |

The `process-upload` step internally calls:
- Text resolution (from blob/text/URL)
- Normalization via normalizer services
- Analysis via analyzer services (placeholders)

---

## 4. Job Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: action creates job
    PENDING --> PROCESSING: worker starts
    PROCESSING --> DONE: passage created
    PROCESSING --> FAILED: exception → failJob
    PENDING --> FAILED: worker never ran / early error
```

`getUploadStatus(jobId)` reads the job scoped to `userId`. When `status === DONE`
and a `passageId` exists, it fetches the passage row and maps it through
`toPassageData` before returning.

---

## API Contracts

### `uploadFileAction(formData)` — input (txt / pdf)
`FormData` fields:
```
file:       File            // raw .txt or .pdf (validated, ≤10MB)
passageId:  string          // Client-generated UUID (becomes Passage.id)
title:      string          // min length 1
sourceType: "txt" | "pdf"
startedAt:  string          // number as string → Passage.createdAt (ordering)
```

### `uploadTextAction(input)` — input (paste)
```typescript
{
  passageId: string,   // Client-generated UUID (becomes Passage.id)
  title: string,       // min length 1
  text: string,        // validated by validateTextContent (50..100k chars)
  startedAt: number,   // Client timestamp → Passage.createdAt (ordering)
}
```

### response (both)
```typescript
{ success: true, data: { jobId: string } }
```
> A blob-write failure in `uploadFileAction` still returns `{ jobId }` — the job
> is marked `FAILED` and surfaced through `getUploadStatus` polling.

### `getUploadStatus` — response
```typescript
{
  success: true,
  data: {
    status: "PENDING" | "PROCESSING" | "DONE" | "FAILED",
    passageId: string | null,
    error: string | null,
    passage: PassageData | null,   // Non-null only when DONE
  }
}
```

### `upload/process` — event payload
Source descriptor: exactly one of `text` / `blobPath` / `url` is set per `sourceType`.
```typescript
{
  jobId: string,
  userId: string,
  title: string,
  sourceType: "paste" | "txt" | "pdf" | "youtube",
  passageId: string,   // Client UUID
  startedAt: number,
  text?: string,       // paste
  blobPath?: string,   // txt / pdf
  url?: string,        // youtube (future)
}
```

---

## Error Handling

| Stage | Failure | Behavior |
|-------|---------|----------|
| Action input | Schema invalid | `zod.parse` throws before any DB write |
| Action auth | No user | `getUserId` throws; no job created |
| Create job | DB error | Action throws; surfaced to caller |
| Emit event | Inngest error | Action throws; job left `PENDING` |
| Worker step | Exception | `failJob` sets `status: FAILED` + `error`, re-throws for retry |
| Status read | Job not found / wrong user | Throws `"Job not found"` |

---

## File Structure (logic layer)

```
src/features/upload/
├── actions.ts                       # Server Action: create job, emit event, read status
├── services/                        # Processing services (v2)
│   ├── upload-processor.ts # Pipeline orchestrator
│   ├── normalizers/
│   │   ├── text-normalizer.ts
│   │   └── pdf-normalizer.ts
│   └── analyzers/
│       ├── cefr-detector.ts
│       ├── vocabulary-extractor.ts
│       └── topic-tagger.ts
├── lib/
│   └── pdf-parsers.ts              # PDF parsing
└── schemas/
    └── upload.ts             # Validation schemas

src/services/inngest/
├── client.ts                        # Inngest client + upload/process event schema
└── functions/
    └── process-upload.ts            # Background worker (thin orchestrator)

src/types/
└── passage.ts                       # PassageData type + toPassageData mapper (shared model)

prisma/
└── UploadJob, Passage models        # Job status tracking + persisted passage
```

UI files (`upload-modal.tsx`, `sources-panel.tsx`, `use-upload-submit.ts`,
`use-study-workspace-state.ts`) are documented in
[Upload Render Flow](./upload-render-flow.md).

---

## Future Improvements

- [ ] Replace hardcoded CEFR level with AI detection in `detect-cefr-level`.
- [ ] Push status updates (WebSocket/SSE) instead of client polling.
