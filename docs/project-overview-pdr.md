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

## Current State (2026-05-11)

Fully functional MVP with Supabase Auth + PostgreSQL + Supabase Storage. All core features operational: upload/analyze pipeline, three-panel study workspace, SM-2 spaced repetition, progress tracking.

**Completed milestones:**
- Phase 1-4: Core MVP + Sentry integration (2026-04-27 to 2026-05-01)
- Phase 6 (partial): Three-panel resizable study workspace
- Phase 7: Supabase Auth — email/password + Google OAuth, middleware protection
- Phase 8 (partial): PostgreSQL migration (Supabase), Supabase Storage for file uploads
- Prisma client security extension for auto user context injection
- Zod validation across all server actions and API routes

---

## Out of Scope (Current)

- Real-time collaboration, social features
- Mobile native apps, payment/billing
- Content library/curation, audio pronunciation, grammar exercises

---

**See also:**
- Business goals & metrics → [`docs/database/brd.md`](database/brd.md)
- Functional requirements → [`docs/database/srs.md`](database/srs.md)
- Use cases → [`docs/database/use-case.md`](database/use-case.md)

---

**Status:** Active
**Last Updated:** 2026-05-11
