# Use Cases
## Auth

### UC-1A: Sign In / Sign Up

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

### UC-1B: Sign Out

**Actor:** Authenticated User

### Main Flow

1. User clicks avatar in sidebar
2. User clicks "Sign Out" in dropdown menu
3. Clerk signs out the active session
4. System clears auth state
5. System redirects to `/sign-in`

---

## Upload & Read

### UC-2A: Upload Content

**Actor:** Authenticated User

**Preconditions:** User is signed in, on `/study` or `/upload` page

**Primary entry points:** `uploadTextAction` (text paste), `uploadFileAction` (PDF/video) — Server Actions in `src/features/upload/actions.ts`

### Main Flow

1. User selects file upload (drag-and-drop or click) or text paste, with an optional title
2. System validates input (file type, size 10MB, text length 50–100k chars)
3. System stores the raw file in blob storage (PDF → rendered from blob URL; YouTube URL → embed URL)
4. System extracts text from the source (PDF via `pdf-parse`, text/YouTube transcript via appropriate extractor)
5. System runs CEFR detection (AI: gpt-4o-mini → heuristic fallback)
6. System persists Passage (with blob file path/URL, extracted text, CEFR level) to DB
7. System displays the source in reading view (PDF viewer from blob, or YouTube embed, or raw text)

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | Validation fails → show error message, allow retry |
| 5a | AI detection fails → use heuristic fallback (avg sentence length + long-word ratio) |
| 5b | Heuristic also fails → return error, suggest shorter/simpler text |

---

### UC-2B: Read Passage — Original vs Generated View

**Actor:** Authenticated User

**Preconditions:** Passage exists in DB, user owns it, blob file path/URL stored

### Main Flow

1. User navigates to reading view (`/reading/[id]` or study content panel)
2. System displays the **original** view — PDF rendered from blob URL, YouTube embed, or raw text
3. User toggles to **generated** view
4. System displays the extracted passage text alongside CEFR level badge

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | No blob stored (text paste) → display raw text directly as original view |
| 4a | Generated text unavailable → show notice; user can only use original view |

---

## Studio Actions

### UC-03A: Take Flashcard Test

**Actor:** Authenticated User

**Preconditions:** Passage exists, user owns it, questions have been generated (see UC-03b)

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

### UC-3B: Generate Quiz Questions (On Demand)

**Actor:** Authenticated User

**Preconditions:** Passage exists, user owns it, no questions generated yet

**Primary entry point:** `generateQuizQuestionsAction` — Server Action in `src/features/studio-panel/actions.ts`

### Main Flow

1. User clicks "Generate Quiz" in the studio panel for a passage
2. System validates passage ownership and checks questions don't already exist
3. System generates 5 comprehension questions with source citations using the passage text (AI: gpt-4o-mini)
4. System persists Questions to DB linked to the Passage
5. System updates the studio artifact status to `done`
6. System displays the quiz card in the studio panel

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | Questions already exist → skip generation, show existing questions |
| 3a | AI generation fails → show error, allow retry |
| 3b | User cancels → no partial state persisted |


### UC-3C: Ask Study Chat

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



## Vocabulary

### UC-04: Review Vocabulary (Spaced Repetition)

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



### UC-05: Save Vocabulary

**Actor:** Authenticated User

**Preconditions:** User is signed in with a selected term

**Primary route:** `POST /api/vocabulary`

### Main Flow

1. User saves a selected term and its translation for later use
2. System upserts the entry by a stable identity key — `user + normalized term +
   target language + normalized translation`
3. System records an occurrence for the passage/context and returns the saved item
   as a stable DTO

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | Same term, same meaning (normalized translation equal) → update in place, increment save count rather than duplicate |
| 2b | Same term, different meaning (normalized translation differs) → create a separate item |
| 3a | Same term + meaning seen in a different passage/context → one item, additional occurrence recorded |

---

### UC-06: Translate Selection

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




### UC-10: Search Dictionary

**Actor:** Authenticated User

**Preconditions:** Seeded English-Vietnamese dictionary exists

**Primary entry points:** `suggestDictionaryTermsAction`,
`getDictionaryEntryDetailAction` — Server Actions in `features/dictionary/actions.ts`

### Main Flow

1. User searches dictionary entries by headword, alias, or normalized query
2. System returns matching entries grouped by headword

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | No match → return empty result with suggestions |

---

**Last Updated:** 2026-07-08
