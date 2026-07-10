# Event-Driven Upload Architecture Plan

**Status:** Pending  
**Created:** 2026-07-10

---

## Overview

Triển khai kiến trúc event-driven cho upload workflow:
- Upload → immediate response với jobId
- Background AI processing (CEFR detection)
- Poll status từ UI

---

## Components

### 1. Database: UploadJob Model

```prisma
enum UploadStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}

model UploadJob {
  id          String       @id                    // = jobId, idempotency key
  userId      String                                // ai sở hữu
  status      UploadStatus @default(PENDING)      // PENDING | PROCESSING | DONE | FAILED
  sourceType  String                                // paste/txt/pdf/youtube
  blobPath    String?                               // để cleanup nếu là file
  passageId   String?                               // điền khi DONE — trỏ tới kết quả
  error       String?                               // lý do nếu FAILED
  createdAt   DateTime
  updatedAt   DateTime
}
```

### 2. Queue: Inngest Integration

- Setup Inngest client
- Tạo function `processUploadJob`
- Gọi AI CEFR detection trong background

### 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload-status` | GET | Poll job status |
| `/api/jobs/process` | POST | Inngest calls this (via HTTP) |

### 4. UI: Polling Hook

```typescript
// useUploadStatus(jobId) → { status, passageId, error }
```

---

## Phases

- [ ] Phase 1: Database - Add UploadJob model
- [ ] Phase 2: Queue - Setup Inngest client
- [ ] Phase 3: Actions - Modify uploadFileAction
- [ ] Phase 4: API - Add status endpoint
- [ ] Phase 5: UI - Add polling hook
- [ ] Phase 6: Test - Integration test

---

## Dependencies

- Inngest SDK
- Prisma migration
- Existing upload flow (sẽ refactor)

---

## Next Steps

→ Phase 1: Add UploadJob model
