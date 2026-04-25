---
title: "English Reading Training App MVP Implementation"
description: "MVP for AI-powered English reading comprehension app with text/PDF upload, CEFR level detection, simplified content, and flashcard-based testing"
status: pending
priority: P1
effort: 40h
branch: main
tags: [mvp, nextjs, ai, education, cefr]
created: 2026-04-20
---

# English Reading Training App MVP

## Overview

AI-powered English reading training platform that transforms user content into leveled reading materials with comprehension testing.

**Core Features (MVP):**
1. Text/PDF upload with drag-drop
2. AI CEFR level detection (A1-C2) via Google Gemini API
3. Content simplification to user's target level
4. Flashcard-style reading comprehension test with source citations
5. Basic progress tracking with SM-2 spaced repetition

**Tech Stack:**
- Frontend: Next.js 15 + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4
- Backend: Next.js API Routes + Server Actions
- Database: Prisma + SQLite
- AI: Google Gemini API (gemini-1.5-flash)
- PDF: pdf-parse (Node.js)
- Deploy: Vercel

**Design System:** See `docs/design-guidelines.md` for complete specifications.

---

## Phase Overview

| Phase | Status | Effort | Dependencies |
|-------|--------|--------|--------------|
| [01. Project Setup](phase-01-project-setup.md) | pending | 3h | none |
| [02. Database Schema](phase-02-database-schema.md) | pending | 4h | 01 |
| [03. Upload Handling](phase-03-upload-handling.md) | pending | 6h | 01 |
| [04. Gemini Integration](phase-04-gemini-integration.md) | pending | 8h | 02 |
| [05. Reading View](phase-05-reading-view.md) | pending | 6h | 04 |
| [06. Flashcard Test](phase-06-flashcard-test.md) | pending | 8h | 04, 05 |
| [07. Progress Tracking](phase-07-progress-tracking.md) | pending | 5h | 02, 06 |

**Total Estimated Effort:** 40 hours

---

## Key Dependencies

```
phase-01 (project setup)
    ↓
phase-02 (database schema)
    ↓
phase-03 (upload handling) ←───┐
    ↓                          │
phase-04 (gemini integration)   │
    ↓                          │
phase-05 (reading view) ───────┘
    ↓
phase-06 (flashcard test)
    ↓
phase-07 (progress tracking)
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Upload  │  │  Reading │  │  Test    │  │Progress  │       │
│  │  View    │  │  View    │  │  View    │  │Dashboard │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼────────────┼────────────┼──────────────┼──────────────┘
        │            │            │              │
┌───────┴────────────┴────────────┴──────────────┴──────────────┐
│                      Server Actions / API Routes                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│  │ File       │  │ Content    │  │ Questions  │  │Progress │ │
│  │ Processing │  │ Analysis   │  │ Generation │  │Tracking │ │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └────┬────┘ │
└─────────┼────────────────┼────────────────┼───────────────┼────┘
          │                │                │               │
┌─────────┴────────────────┴────────────────┴───────────────┴────┐
│                      Data & Service Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Prisma   │  │ Gemini   │  │ pdf-parse │  │ SM-2     │    │
│  │ ORM      │  │ API      │  │          │  │Algorithm │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── page.tsx                 # Dashboard/landing
│   │   ├── upload/
│   │   │   └── page.tsx             # Upload interface
│   │   ├── reading/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Reading view
│   │   ├── test/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Flashcard test
│   │   └── progress/
│   │       └── page.tsx             # Progress dashboard
│   ├── api/
│   │   ├── upload/route.ts          # File upload handler
│   │   ├── analyze/route.ts         # Gemini CEFR analysis
│   │   ├── questions/route.ts       # Question generation
│   │   └── progress/route.ts        # Progress tracking
│   └── layout.tsx
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── upload-zone.tsx
│   ├── reading-content.tsx
│   ├── flashcard-test.tsx
│   └── progress-dashboard.tsx
├── lib/
│   ├── db.ts                        # Prisma client
│   ├── gemini.ts                    # Gemini API client
│   ├── pdf-parser.ts                # PDF processing
│   ├── sm2-algorithm.ts             # Spaced repetition
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── types/
    └── index.ts
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini API rate limits | Medium | Implement request queuing, fallback to cached results |
| PDF parsing errors | Medium | Validate content post-extraction, show extraction warnings |
| SM-2 implementation bugs | Low | Reference SuperMemo spec, unit test edge cases |
| Large file uploads | Low | 10MB limit, streaming upload with progress |

---

## Success Criteria

1. User can upload text/PDF and receive CEFR level
2. Content is simplified to target reading level
3. Generated questions include source citations from passage
4. Progress tracked correctly with SM-2 scheduling
5. Responsive design matches wireframes in `docs/wireframe/`

---

## Unresolved Questions

1. Should we implement user authentication in MVP or skip to Phase 2?
2. What is the maximum passage length for question generation?
3. Should we support batch upload of multiple files?

---

## References

- [Design Guidelines](../docs/design-guidelines.md)
- [Wireframes](../docs/wireframe/)
- [Research: CEFR Analysis](../reports/researcher-text-difficulty-analysis-260420-2152.md)
- [Research: Flashcard Systems](../reports/researcher-flashcard-educational-systems-2024.md)
