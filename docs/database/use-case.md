# Use Case Document

**English Reading Training App**

---

## UC-01: Upload and Analyze Content

**Actor:** Authenticated User

**Preconditions:** User is signed in, on `/study` or `/upload` page

### Main Flow

1. User selects file upload (drag-and-drop or click) or text paste
2. System validates input (file type, size 10MB, text length 50-100k chars)
3. System extracts text if PDF
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

## UC-04: Review Due Cards (Spaced Repetition)

**Actor:** Authenticated User

**Preconditions:** User has cards with nextReviewDate <= now

### Main Flow

1. User navigates to Progress Dashboard
2. System displays due card count
3. User clicks "Study Now"
4. System creates StudySession record
5. System fetches up to 20 due cards
6. For each card:
   a. System displays question
   b. User answers
   c. User rates recall quality (0-5)
   d. System calculates SM-2 interval (easeFactor, intervalDays, nextReviewDate)
   e. System upserts CardReview record
7. User completes session
8. System updates StudySession (completedAt, cardsReviewed, accuracyRate)

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | No due cards → "Study Now" disabled, show "All caught up!" |
| 6d | SM-2 easeFactor drops below 1.3 → reset to 1.3 |

---

## UC-05: Sign In / Sign Up

**Actor:** Unauthenticated User

### Main Flow — Email/Password Sign In

1. User visits protected route → redirected to `/sign-in?next={original}`
2. User enters email and password
3. System calls Supabase `signInWithPassword()`
4. System syncs user to local DB (upsert by supabaseAuthId)
5. System redirects to original route

### Main Flow — Google OAuth

1. User clicks "Continue with Google"
2. System redirects to Google consent screen
3. Google redirects to `/auth/callback` with code
4. System exchanges code for session
5. System syncs user to local DB (upsert by supabaseAuthId)
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
3. System calls Supabase `signOut()`
4. System clears session cookies
5. System redirects to `/sign-in`

---

## UC-07: View Progress Dashboard

**Actor:** Authenticated User

**Preconditions:** User has at least one study session

### Main Flow

1. User navigates to Progress Dashboard
2. System displays stats: total cards, mature cards, due cards, today's reviews
3. User reviews study history

### Alternative Flows

| Step | Alternative |
|------|------------|
| 2a | No data yet → show empty state with "Upload your first passage" CTA |

---

## UC-08: Manage Study Workspace

**Actor:** Authenticated User

**Preconditions:** User is signed in

### Main Flow

1. User navigates to `/study`
2. System displays three-panel resizable workspace
3. User adjusts panel sizes by dragging dividers
4. System persists sizes to localStorage
5. User clicks upload button in sources panel
6. System shows upload modal (file/text toggle)
7. User uploads content → UC-01 flow continues
8. Content appears in content panel, quiz in studio panel

---

**Last Updated:** 2026-05-09
