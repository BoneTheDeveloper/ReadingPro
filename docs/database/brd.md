# Business Requirements Document (BRD)

**English Reading Training App**

---

## 1. Business Objective

Build an AI-powered English reading comprehension trainer that helps non-native speakers improve reading skills through adaptive content analysis, flashcard-based testing, and spaced repetition.

---

## 2. Target Users

| Segment | Description |
|---------|-------------|
| CEFR Exam Candidates | Non-native speakers preparing for A1-C2 exams |
| Self-learners | Individuals improving English reading independently |

_Target: self-taught users. Future: sharing function for collaborative learning._

---

## 3. Problem Statement

Existing tools fail language learners in 3 ways:
1. **No level adaptation** — content isn't matched to learner's CEFR level
2. **No retention tracking** — no systematic review scheduling
3. **No source-backed testing** — answers can't be traced to original text

---

## 4. Solution

Integrated pipeline: **Upload → Analyze → Read → Test → Retain**

1. Upload any English text or PDF
2. AI detects CEFR level automatically
3. Content simplified one level below for comprehension support

> **Note:** A1-level content skips the simplification step entirely — `simplifiedContent` remains null.

4. Comprehension questions generated with source citations
5. SM-2 spaced repetition schedules reviews for long-term retention

> **Session lifecycle:** Study sessions track all activities (reading, quizzes, reviews). Sessions auto-close when user logs out or is inactive for an extended period.

---

## 5. Core Value Propositions

| Value | Description |
|-------|-------------|
| Adaptive Difficulty | AI detects text complexity and simplifies to learner's level |
| Source-Backed Testing | Every answer traceable to passage text with line citations |
| Long-term Retention | SM-2 algorithm ensures efficient review scheduling |
| Minimal Friction | Upload text/PDF, get instant analysis and flashcards |

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| User retention (7-day) | >40% return rate |
| Cards reaching maturity | >60% of studied cards |
| Average session duration | >5 minutes |

---

## 7. Business Model

| Tier | Features |
|------|----------|
| FREE | Upload (limited), analyze, flashcards, progress tracking, below-question explanations |
| PRO | Higher upload limits, paragraph-attached explanations (explanations linked directly to passage paragraphs, not just shown below questions), advanced analytics, export (future) |

_Payment/billing integration deferred — not permanently excluded. All features currently free during MVP._

---

## 8. Out of Scope (Current)

- Real-time collaboration
- Social features (leaderboards, sharing)
- Mobile native apps
- Payment/billing integration (deferred — see §7 note)
- Content library/curation
- Audio pronunciation
- Grammar exercises

---

## 9. Milestones

| Phase | Scope | Status |
|-------|-------|--------|
| MVP | Upload, CEFR detect, simplify, questions, flashcards, progress | Done |
| Auth | Clerk (email/password + Google OAuth) | Done |
| Sentry | Error tracking, performance monitoring, source maps | Done |
| Content Expansion | YouTube transcription, OCR for scanned PDFs | Planned |
| Advanced Features | Resizable workspace, analytics dashboard | In Progress |
| Production | Neon PostgreSQL, Vercel Blob, Vercel deploy, multi-user | In Progress |

---

**Last Updated:** 2026-06-05
