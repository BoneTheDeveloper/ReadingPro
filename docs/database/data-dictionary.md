# Data Dictionary

**English Reading Training App — Prisma Schema**

---

## Enums

### CEFRLevel

| Value | Description |
|-------|-------------|
| A1 | Beginner |
| A2 | Elementary |
| B1 | Intermediate |
| B2 | Upper Intermediate |
| C1 | Advanced |
| C2 | Mastery |

### SourceType

| Value | Description |
|-------|-------------|
| TEXT | Direct text input |
| PDF | PDF file upload |

### QuestionType

| Value | Description |
|-------|-------------|
| MULTIPLE_CHOICE | 4-option multiple choice |
| TRUE_FALSE | True/false binary question |

### Tier

| Value | Description |
|-------|-------------|
| FREE | Free tier |
| PRO | Premium tier (future) |

---

## Tables

### UserProfile

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, default: cuid() | Unique identifier |
| email | String? | Unique, nullable | User email from Supabase Auth |
| name | String? | nullable | Display name |
| avatarUrl | String? | nullable | Profile avatar URL |
| bio | String? | nullable | User bio |
| targetLevel | CEFRLevel | Default: B2 | Target CEFR learning level |
| tier | Tier | Default: FREE | Subscription tier |
| stripeCustomerId | String? | Unique, nullable | Stripe billing ID (future) |
| createdAt | DateTime | Default: now() | Record creation time |
| updatedAt | DateTime | @updatedAt | Last modification time |

**Relations:** has many Passage, StudySession, CardReview

---

### Passage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, default: cuid() | Unique identifier |
| userId | String | FK → UserProfile.id | Owner of the passage |
| title | String | — | Passage title (first line of content) |
| content | String | — | Original text content |
| simplifiedContent | String? | nullable | AI-simplified version |
| originalLevel | CEFRLevel? | nullable | AI-detected CEFR level |
| simplifiedLevel | CEFRLevel? | nullable | CEFR level of simplified version |
| wordCount | Int | — | Word count of original content |
| sourceType | SourceType | — | Input source (TEXT or PDF) |
| fileUrl | String? | nullable | Supabase Storage URL for uploaded file |
| createdAt | DateTime | Default: now() | Record creation time |
| updatedAt | DateTime | @updatedAt | Last modification time |

**Relations:** belongs to UserProfile, has many Question

**Index:** `[userId, createdAt]`

---

### Question

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, default: cuid() | Unique identifier |
| passageId | String | FK → Passage.id | Parent passage |
| questionText | String | — | Question text |
| options | Json | — | Answer options array `[{id, text}]` |
| correctOption | String | — | ID of the correct option |
| sourceText | String | — | Quoted text from passage supporting answer |
| sourceLine | Int | — | Line number of source text in passage |
| explanation | String | — | Explanation of why answer is correct |
| questionType | QuestionType | Default: MULTIPLE_CHOICE | Question format |
| difficulty | Int | Default: 3 | Difficulty rating (1-5) |
| createdAt | DateTime | Default: now() | Record creation time |

**Relations:** belongs to Passage, has many CardReview

---

### CardReview

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, default: cuid() | Unique identifier |
| questionId | String | FK → Question.id | Reviewed question |
| userId | String | FK → UserProfile.id | Reviewing user |
| qualityRating | Int | — | SM-2 quality rating (0-5) |
| easeFactor | Float | Default: 2.5 | SM-2 ease factor |
| intervalDays | Int | Default: 1 | Days until next review |
| repetitions | Int | Default: 0 | Consecutive correct reviews |
| nextReviewDate | DateTime | Default: now() | Scheduled next review date |
| reviewedAt | DateTime | Default: now() | Last review timestamp |

**Relations:** belongs to Question, belongs to UserProfile

**Unique constraint:** `[questionId, userId]`

**Index:** `[userId, nextReviewDate]`

---

### StudySession

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, default: cuid() | Unique identifier |
| userId | String | FK → UserProfile.id | Session owner |
| passageId | String? | FK → Passage.id, nullable | Optional associated passage |
| startedAt | DateTime | Default: now() | Session start time |
| completedAt | DateTime? | nullable | Session completion time |
| cardsReviewed | Int | Default: 0 | Total cards reviewed |
| newCards | Int | Default: 0 | New cards encountered |
| correctCount | Int | Default: 0 | Correct answers count |
| incorrectCount | Int | Default: 0 | Incorrect answers count |
| accuracyRate | Float? | nullable | Computed accuracy (correctCount / cardsReviewed) |

**Relations:** belongs to UserProfile

**Index:** `[userId, startedAt]`

---

## Cascade Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| UserProfile | Passage | Cascade |
| UserProfile | StudySession | Cascade |
| UserProfile | CardReview | Cascade |
| Passage | Question | Cascade |
| Question | CardReview | Cascade |

---

**Last Updated:** 2026-05-09
