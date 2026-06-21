# Use Cases

**English Reading Training App**

Single source of truth for application use cases. Each use case lists its actor,
preconditions, main flow, and—where it maps to an HTTP endpoint—the primary route(s).

**Lens:** black box, actor-centric — *what* the user does and how the system responds.
This doc deliberately omits file/function names and internal call chains. For the
white-box code path of any use case, see the matching flow in
[`../Flows/`](../Flows/README.md).


## UC-01: Upload and Analyze Content

**Actor:** Authenticated User

**Preconditions:** User is signed in, on `/study` or `/upload` page

**Primary routes:** `POST /api/upload/text` (text paste), `POST /api/upload` (PDF file)

### Main Flow

1. User selects file upload (drag-and-drop or click) or text paste, with an optional title
2. System validates input (file type, size 10MB, text length 50-100k chars)
3. System extracts text if PDF (stores the file first)
4. System runs CEFR detection (AI → heuristic fallback)
5. System simplifies content to one CEFR level below
6. System generates 5 comprehension questions with source citations
7. System persists Passage and Questions to DB
8. System displays passage in reading view

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | Validation fails → show error message, allow retry |
| 4a | AI detection fails → use heuristic fallback (sentence length + word complexity) |
| 4b | Both fail → return error, suggest shorter/simpler text |

---

## UC-02: Read Passage with Simplified View

**Actor:** Authenticated User

**Preconditions:** Passage exists in DB, user owns it

### Main Flow

1. User navigates to reading view (`/reading/[id]` or study content panel)
2. System displays original passage with line numbers
3. User toggles "Simplified" view
4. System displays simplified version alongside original level badges

### Alternative Flows

| Step | Alternative |
|------|------------|
| 3a | No simplified content available → toggle disabled |

---

## UC-03: Take Flashcard Test

**Actor:** Authenticated User

**Preconditions:** Passage has generated questions

### Main Flow

1. User starts test from passage or study workspace
2. System displays question #1 with progress bar
3. User selects an option (click or keyboard 1-4)
4. User submits answer (Enter key or click "Check Answer")
5. System shows correct/incorrect feedback with explanation and source citation
6. System highlights source text in passage panel and scrolls to it
7. User clicks "Next Question"
8. Repeat steps 2-7 for all questions
9. System displays final score summary (correct/incorrect, streak)

### Alternative Flows

| Step | Alternative |
|------|------------|
| 3a | No selection made → "Check Answer" disabled |
| 5a | All questions complete → show results summary directly |

---

## UC-04: Review Vocabulary (Spaced Repetition)

**Actor:** Authenticated User

**Preconditions:** User has saved vocabulary items with `nextReviewAt <= now`

**Primary routes:** `POST /api/vocabulary/[id]/review`, `PATCH /api/vocabulary/[id]/status`,
`GET /api/progress/stats`

### Main Flow

1. User opens their vocabulary list and sees items due for review (filtered by `nextReviewAt`)
2. User reviews an item and marks the result correct or incorrect
3. System submits `POST /api/vocabulary/[id]/review` with `{ isCorrect }`
4. System advances the item's status (NEW → LEARNING → MASTERED) and reschedules `nextReviewAt`
   using the fixed-interval schedule (`simpleSchedule`)
5. System records `lastReviewedAt`
6. Progress stats (streak, time studied, active days) reflect the activity

### Alternative Flows

| Step | Alternative |
|------|------------|
| 1a | No items due → nothing to review |
| 4a | User manually overrides status via `PATCH /api/vocabulary/[id]/status` |

---

## UC-05: Sign In / Sign Up

**Actor:** Unauthenticated User

### Main Flow — Email/Password Sign In

1. User visits protected route → redirected to `/{locale}/sign-in?redirect_url={original}`
2. User enters email and password
3. Clerk authenticates the user
4. System syncs the Clerk identity to local DB (`UserProfile.id = Clerk user id`)
5. System redirects to original route

### Main Flow — Google OAuth

1. User clicks "Continue with Google"
2. Clerk redirects to Google consent screen
3. Google redirects through Clerk's OAuth callback
4. Clerk establishes the app session
5. System syncs the Clerk identity to local DB
6. System redirects to `/study`

### Alternative Flows

| Step | Alternative |
|------|------------|
| 3a (email) | Invalid credentials → show error message |
| 3a (email) | User not found → suggest sign-up |
| 4a (OAuth) | OAuth exchange fails → redirect to sign-in with error |

---

## UC-06: Sign Out

**Actor:** Authenticated User

### Main Flow

1. User clicks avatar in sidebar
2. User clicks "Sign Out" in dropdown menu
3. Clerk signs out the active session
4. System clears auth state
5. System redirects to `/sign-in`

---

## UC-07: View Progress Dashboard

**Actor:** Authenticated User

**Preconditions:** User has at least one study session

**Primary route:** `GET /api/progress/stats`

### Main Flow

1. User navigates to Progress Dashboard
2. System displays stats: study streak, time studied today, time studied this week, active days this week
3. User reviews study history

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | No data yet → show empty state with "Upload your first passage" CTA |

---

## UC-08: Manage Study Workspace

**Actor:** Authenticated User

**Preconditions:** User is signed in

**Primary page:** `/[locale]/study`

### Main Flow

1. User navigates to `/study`
2. System displays three-panel resizable workspace
3. User adjusts panel sizes by dragging dividers
4. System persists sizes to localStorage
5. User clicks upload button in sources panel
6. System shows upload modal (file/text toggle)
7. User uploads content → UC-01 flow continues
8. Content appears in content panel, quiz in studio panel; user can study original or
   simplified content, open generated questions, translate selections (UC-09), and chat
   about the passage (UC-12)

---

## UC-09: Translate Selection

**Actor:** Authenticated User

**Preconditions:** User owns the passage containing the selection

**Primary route:** `POST /api/translate`

### Main Flow

1. User selects English text from an owned passage
2. System validates selection limits and checks passage ownership
3. System returns a translation
4. System records translation cache and history

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | Selection exceeds limits or passage not owned → reject with error |
| 3a | Cache hit → return cached translation without re-calling the model |

---

## UC-10: Save Vocabulary

**Actor:** Authenticated User

**Preconditions:** User is signed in with a selected term

**Primary route:** `POST /api/vocabulary`

### Main Flow

1. User saves a selected term and its translation for later use
2. System upserts the entry by a stable user/source/selection/context key

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | Entry with same key exists → update in place rather than duplicate |

---

## UC-11: Search Dictionary

**Actor:** Authenticated User

**Preconditions:** Seeded English-Vietnamese dictionary exists

**Primary routes:** `GET /api/dictionary/lookup`, `GET /api/dictionary/search`,
`GET /api/dictionary/suggest`, `GET /api/dictionary/entries/[entryId]`

### Main Flow

1. User searches dictionary entries by headword, alias, or normalized query
2. System returns matching entries grouped by headword

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | No match → return empty result with suggestions |

---

## UC-12: Ask Study Chat

**Actor:** Authenticated User

**Preconditions:** User owns the selected passage

**Primary route:** `POST /api/study/studio/chat`

### Main Flow

1. User asks a tutor question about the selected passage
2. System loads recent persisted messages and the passage context
3. System streams a response
4. System persists the assistant answer

### Alternative Flows

| Step | Alternative |
|------|------------|
| 1a | Passage not owned → reject request |

---

**Last Updated:** 2026-06-17
