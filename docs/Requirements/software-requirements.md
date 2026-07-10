# Software Requirements Specification (SRS)

## 1. Functional Requirements

### FR-01: Content Upload

| ID | Requirement |
|----|-------------|
| FR-01.1 | Accept text input (50-100k characters) |
| FR-01.2 | Accept file upload (txt/pdf, max 10MB) |
| FR-01.3 | Extract text from PDF via `pdf-parse` |
| FR-01.4 | Validate file type, size, and text length before processing |
| FR-01.5 | Store file through the storage adapter: local filesystem in development, Vercel Blob in preview/production; persist Blob pathname on the Passage record |

### FR-02: CEFR Level Detection

| ID | Requirement |
|----|-------------|
| FR-02.1 | Detect CEFR level (A1-C2) using OpenAI gpt-4o-mini |
| FR-02.2 | Fall back to heuristic analysis (avg sentence length + complex word ratio) if AI fails |
| FR-02.3 | Store detected level on Passage record |

### FR-03: Question Generation

**Status:** Deferred — handled via Studio workflow (separate from upload)

| ID | Requirement |
|----|-------------|
| FR-03.1 | Generate comprehension questions per passage (triggered from Studio, not upload) |

### FR-04: Flashcard Test

| ID | Requirement |
|----|-------------|
| FR-05.1 | Present questions one at a time with progress indicator |
| FR-05.2 | Support keyboard shortcuts (1-4 for options, Enter for submit) |
| FR-05.3 | Show correct/incorrect feedback with explanation and source citation |
| FR-05.4 | Track streak of consecutive correct answers |
| FR-05.5 | Display final score summary |

### FR-05: Vocabulary Capture

| ID | Requirement |
|----|-------------|
| FR-05.1 | Save a selected term + translation from the translate or dictionary surface (`POST /api/vocabulary`) |
| FR-05.2 | Deduplicate items by identity key `userId + normalizedText + targetLanguage + normalizedTranslation`; the translation is normalized (lowercase + collapse-spaces + trim) before keying so casing/whitespace variants do not create duplicates |
| FR-05.3 | Same term + same meaning re-saved → update in place and increment `savedCount`; same term + different meaning → create a separate item |
| FR-05.4 | Record a `VocabularyOccurrence` per passage/context; same term+meaning in a new passage adds an occurrence without duplicating the item |
| FR-05.5 | Return the saved item as the documented `vocabularyDataSchema` DTO (raw Prisma records must be mapped at the route boundary) |
| FR-05.6 | Preserve review progress (`status`, `nextReviewAt`, `lastReviewedAt`) and the first-saved `displayText`/`translation` on re-save |

### FR-06: Vocabulary Spaced Repetition

| ID | Requirement |
|----|-------------|
| FR-06.1 | Accept a boolean review outcome (`isCorrect`) per vocabulary item review |
| FR-06.2 | Advance status (NEW → LEARNING → MASTERED) and reschedule `nextReviewAt` via the fixed-interval `simpleSchedule` (ADR 0005) |
| FR-06.3 | Record `lastReviewedAt` on each review; preserve review progress on item re-save |
| FR-06.4 | Allow manual status override (NEW/LEARNING/MASTERED) per item |

### FR-07: Study Sessions

| ID | Requirement |
|----|-------------|
| FR-07.1 | Create session with startedAt timestamp |
| FR-07.2 | Keep StudySession as a presence/heartbeat record with `lastActivityAt`; quiz performance lives in `QuizResult` (1:1 with the quiz `StudioArtifact`) |
| FR-07.3 | Record quiz correctness and accuracy on `QuizResult` (via `studioRecordQuizResultAction`) |

### FR-08: Progress Dashboard

| ID | Requirement |
|----|-------------|
| FR-08.1 | Display study streak, time studied today, time studied this week, and active days this week (per `GET /api/progress/stats`) |
| FR-08.2 | Surface vocabulary due for review from the vocabulary list |

### FR-09: Authentication

| ID | Requirement |
|----|-------------|
| FR-09.1 | Email/password sign-in and sign-up |
| FR-09.2 | Google OAuth sign-in and sign-up |
| FR-09.3 | Middleware route protection — redirect unauthenticated users to /sign-in |
| FR-09.4 | Sync Clerk user identity to local `UserProfile` record |
| FR-09.5 | User menu with sign-out functionality |

### FR-10: Study Workspace

| ID | Requirement |
|----|-------------|
| FR-10.1 | Three-panel resizable layout (sources, content, studio) |
| FR-10.2 | Persist panel sizes via localStorage |
| FR-10.3 | Upload modal for file/text within workspace |
| FR-10.4 | Quiz rendering with answer feedback in studio panel |

---

## 2. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | AI analysis completes under 30s |
| NFR-02 | Performance | Page load under 2s |
| NFR-03 | Usability | Keyboard accessible |
| NFR-04 | Usability | WCAG 2.1 AA compliance |
| NFR-05 | Security |  Auth for all protected routes |
| NFR-06 | Security | Input validation at API boundaries with Zod |

**Last Updated:** 2026-06-21
