# Tech Stack

**English Reading Training App**

---

## Overview

Modern web-based language learning platform combining multi-input content processing (text, PDF, YouTube), AI-powered CEFR level detection, and spaced repetition flashcard system.

## Frontend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | Next.js 15+ | React Server Components, built-in API routes, excellent DX |
| **UI Library** | React 19 | Latest features, concurrent rendering |
| **Component Library** | shadcn/ui | Modern, accessible, customizable primitives built on Radix UI |
| **Styling** | Tailwind CSS 4 | Utility-first, excellent with shadcn/ui |
| **State Management** | React Context + Server Actions | Simple, sufficient for this scope |
| **Forms** | React Hook Form + Zod | Type-safe validation, great UX |

## Backend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js (via Next.js) | Unified stack, TypeScript everywhere |
| **API Layer** | Next.js API Routes / Server Actions | Collocated with frontend, type-safe |
| **Database** | SQLite (Prisma ORM) | Simple for MVP, portable, easy migration path to PostgreSQL |
| **Auth** | NextAuth.js v5 | OAuth providers, session management |

## AI & Content Processing

| Function | Technology | Cost |
|----------|-----------|------|
| **PDF Text Extraction** | pdfplumber (Python service) | Free (open-source) |
| **Scanned PDF OCR** | Google Cloud Vision AI | $1.50/1000 pages (on-demand) |
| **YouTube Transcription** | OpenAI Whisper | Free (self-hosted) |
| **Content Simplification** | Anthropic Claude API | $0.015/1K tokens |
| **CEFR Level Detection** | Claude API + heuristics | Included in above |
| **Flashcard Generation** | Claude API with citations | Included in above |

## Flashcard System

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Algorithm** | SM-2 (SuperMemo 2) | Proven spaced repetition |
| **Card Formats** | Cloze, sentence completion, definition | Research-backed effectiveness |
| **Progress Tracking** | Custom SQLite schema | Retention rate, mature cards, streaks |

## Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety across stack |
| ESLint + Prettier | Code quality & formatting |
| Prisma | Database ORM & migrations |
| Vitest | Unit testing |
| Playwright | E2E testing |

## Deployment

| Component | Target |
|-----------|--------|
| **Hosting** | Vercel (frontend/API) |
| **Python Service** | Railway/Fly.io (PDF processing) |
| **Database** | SQLite (local) → Cloudflare D1 or Turso (production) |

## Cost Estimates (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Claude API | 1M tokens | ~$15 |
| Google Vision | 100 pages | ~$0.15 |
| Vercel Hobby | Personal | $0 |
| Railway | Basic | $5-20 |
| **Total** | Moderate usage | **$20-40/month** |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Content    │  │  Flashcards  │  │  Dashboard   │       │
│  │   Input UI   │  │    Review    │  │   Progress   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Next.js API Layer                       │
│  Server Actions / API Routes                                 │
└─────────┬──────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬─────────────┬──────────────┐
    ▼           ▼             ▼              ▼
┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐
│ Python  │ │ Claude  │ │   SQLite    │ │ Whisper  │
│ PDF Svc │ │   API   │ │  Database   │ │ Service  │
└─────────┘ └─────────┘ └─────────────┘ └──────────┘
```

## Migration Path

**Phase 1 (MVP):** Text input only, basic level detection
**Phase 2:** Add PDF processing (local)
**Phase 3:** Add YouTube transcription (Whisper)
**Phase 4:** Advanced AI features (scanned PDF, detailed analytics)

## Unresolved Questions

1. Exact CEFR detection accuracy targets (A1-C2 classification)
2. Maximum PDF size limits for processing
3. YouTube video length constraints
4. Offline capability requirements

---

**Status:** Approved
**Last Updated:** 2026-04-20
