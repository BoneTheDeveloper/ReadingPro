# Software Requirements Specification (SRS)

**English Reading Training App**

---

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

### FR-03: Content Simplification

| ID | Requirement |
|----|-------------|
| FR-03.1 | Simplify content to one CEFR level below original |
| FR-03.2 | Preserve core meaning and logical flow |
| FR-03.3 | Store simplified version alongside original |

### FR-04: Question Generation

| ID | Requirement |
|----|-------------|
| FR-04.1 | Generate 5 comprehension questions per passage |
| FR-04.2 | Support MULTIPLE_CHOICE and TRUE_FALSE question types |
| FR-04.3 | Include source text citation with line number for each question |
| FR-04.4 | Provide explanation for correct answer |
| FR-04.5 | Assign difficulty rating (1-5) to each question |
| FR-04.6 | Generate plausible distractors for wrong answers |

### FR-05: Flashcard Test

| ID | Requirement |
|----|-------------|
| FR-05.1 | Present questions one at a time with progress indicator |
| FR-05.2 | Support keyboard shortcuts (1-4 for options, Enter for submit) |
| FR-05.3 | Show correct/incorrect feedback with explanation and source citation |
| FR-05.4 | Track streak of consecutive correct answers |
| FR-05.5 | Display final score summary |

### FR-06: SM-2 Spaced Repetition

| ID | Requirement |
|----|-------------|
| FR-06.1 | Accept quality rating (0-5) after each card review |
| FR-06.2 | Calculate new easeFactor, intervalDays, nextReviewDate per SM-2 |
| FR-06.3 | Upsert CardReview record (unique on [questionId, userId]) |
| FR-06.4 | Fetch due cards where nextReviewDate <= now (limit 20) |

### FR-07: Study Sessions

| ID | Requirement |
|----|-------------|
| FR-07.1 | Create session with startedAt timestamp |
| FR-07.2 | Keep StudySession as a lifecycle record with `lastSeenAt`; quiz performance lives in QuizAttempt |
| FR-07.3 | Record quiz correctness and accuracy on QuizAttempt completion |

### FR-08: Progress Dashboard

| ID | Requirement |
|----|-------------|
| FR-08.1 | Display total cards, mature cards, due cards, today's reviews |
| FR-08.2 | Provide "Study Now" action for due cards |

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
| NFR-03 | Usability | Keyboard accessible, mobile responsive |
| NFR-04 | Usability | WCAG 2.1 AA compliance |
| NFR-05 | Security | Clerk auth for all protected routes |
| NFR-06 | Security | Input validation at API boundaries with Zod |
| NFR-07 | Observability | Sentry error tracking + performance spans |
| NFR-08 | Observability | Pino structured logging |

---

## 3. System Constraints

| Constraint | Detail |
|-----------|--------|
| Framework | Next.js 16 App Router with React Server Components |
| Database | Neon PostgreSQL via Prisma ORM |
| AI Model | OpenAI gpt-4o-mini via Vercel AI SDK |
| Auth | Clerk (email/password + Google OAuth) |
| Storage | Local filesystem in development, Vercel Blob in preview/production |
| Browser | Modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions) |

---

## 4. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/upload` | Upload file, extract text, run analysis pipeline |
| POST | `/api/upload/text` | Submit text content, validate, analyze |
| POST | `/api/cards/review` | Submit SM-2 card review |
| GET | `/api/cards/due` | Fetch due cards for review (limit 20) |
| POST | `/api/study-session` | Ensure active study session window |
| GET | `/api/progress/stats` | Get user progress statistics |

---

## 5. Processing Flows

### Content Analysis Pipeline

```
Upload/Text → Validate → PDF Extract (if needed)
    → CEFR Detect (AI + heuristic fallback)
    → Content Simplify (AI, one level below)
    → Question Generate (AI, 5 MC/TF with citations)
    → Persist Passage + Questions to DB
```

### Card Review Pipeline

```
User answers question → Quality rating (0-5)
    → SM-2 calculate (easeFactor, intervalDays, nextReviewDate)
    → Upsert CardReview
```

### Auth Flow

```
Protected route → Clerk middleware
    → No session → redirect /sign-in?redirect_url={original}
    → Has session → Server action/route uses authenticated user
```

---

**Last Updated:** 2026-06-05
