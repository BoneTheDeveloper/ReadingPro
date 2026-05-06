# Project Overview (PDR)

**English Reading Training App**

---

## Product Description

AI-powered English reading comprehension trainer for language learners. Users upload English text or PDF documents, and the app detects the CEFR difficulty level, provides simplified versions for easier comprehension, generates comprehension questions with source citations, and tracks long-term retention through spaced repetition.

**Target Users:** Non-native English speakers preparing for CEFR exams (A1-C2), self-learners wanting to improve reading skills, language teachers needing comprehension materials.

---

## Problem Statement

Language learners need accessible reading material at appropriate difficulty levels. Existing tools either:
- Don't adapt content to learner's level
- Lack systematic retention tracking
- Don't provide source-backed comprehension testing

---

## Solution

An integrated pipeline: **Upload → Analyze → Read → Test → Retain**

1. Upload any English text or PDF
2. AI detects CEFR level automatically
3. Content simplified one level below for comprehension support
4. Comprehension questions generated with source citations
5. SM-2 spaced repetition schedules reviews for long-term retention

---

## Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| Content Upload | Done | File upload (txt/pdf, max 10MB) or text paste (50-100k chars) |
| CEFR Detection | Done | AI (OpenAI gpt-4o-mini) + heuristic fallback, 6 levels (A1-C2) |
| Content Simplification | Done | AI simplification to one CEFR level below |
| Question Generation | Done | 5 MC/TF questions per passage with source citations |
| Reading View | Done | Original/simplified toggle, reading time, word count |
| Flashcard Test | Done | Interactive quiz with streaks, keyboard shortcuts, scoring |
| SM-2 Spaced Repetition | Done | Review scheduling, due card tracking |
| Progress Dashboard | Done | Total/mature/due cards, today's reviews |
| Study Sessions | Done | Session tracking with accuracy rates |
| Authentication | Planned | NextAuth.js v5 (currently hardcoded demo user) |
| YouTube Transcription | Planned | Whisper-based video transcription |
| Advanced Analytics | Planned | Detailed progress charts, retention curves |

---

## User Flows

### Primary Flow: Upload & Study
```
Upload text/PDF → Processing → Reading View → Flashcard Test → Progress
```

### Secondary Flow: Spaced Repetition Review
```
Progress Dashboard → Due Cards → Review Session → Session Summary
```

---

## Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Performance** | AI analysis under 30s, page load under 2s |
| **Usability** | Keyboard accessible, mobile responsive, WCAG 2.1 AA |
| **Data** | All data persisted locally (SQLite), export-ready |
| **Security** | No auth yet (MVP); env vars for API keys |
| **Scalability** | SQLite sufficient for single-user MVP; migration path to PostgreSQL |

---

## Design Principles

1. **Typography-first** — Readability over decoration
2. **Calm interface** — Minimal cognitive load, focus on content
3. **Source-backed** — Every answer traceable to passage text
4. **Progressive difficulty** — Content adapts to learner level
5. **Spaced retention** — SM-2 algorithm for long-term memory

---

## Milestones

| Phase | Scope | Status |
|-------|-------|--------|
| **MVP** | Upload, CEFR detect, simplify, questions, flashcards, progress | **Done** |
| **Phase 2** | Authentication, user profiles, shared dashboard layout | Planned |
| **Phase 3** | YouTube input, scanned PDF OCR, multi-language | Planned |
| **Phase 4** | Advanced analytics, export, collaboration features | Planned |
| **Production** | PostgreSQL, Vercel deploy, multi-tenant | Future |

---

## Out of Scope (Current)

- Multi-user support (no auth)
- Real-time collaboration
- Social features (leaderboards, sharing)
- Mobile native apps
- Payment/billing
- Content library/curation
- Audio pronunciation
- Grammar exercises

---

## Success Metrics (Future)

| Metric | Target |
|--------|--------|
| CEFR detection accuracy | >80% agreement with human assessment |
| User retention (7-day) | >40% return rate |
| Cards reaching maturity | >60% of studied cards |
| Average session duration | >5 minutes |
| Question quality score | >4/5 user rating |

---

**Status:** Active
**Last Updated:** 2026-05-06
