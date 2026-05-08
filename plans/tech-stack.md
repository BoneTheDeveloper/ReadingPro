# Tech Stack

**English Reading Training App**

---

## Overview

Modern web-based language learning platform combining text/PDF content processing, AI-powered CEFR level detection (Google Gemini), and SM-2 spaced repetition flashcard system.

---

## Frontend Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Framework** | Next.js (App Router, RSC) | 16.2.4 | React Server Components, built-in API routes |
| **UI Library** | React | 19.2.4 | Latest features, concurrent rendering |
| **Component Library** | shadcn/ui (base-nova) | 4.4.0 | Accessible primitives built on Base UI + Radix |
| **Styling** | Tailwind CSS | 4 | Utility-first, tw-animate-css |
| **State Management** | React Context + useState | - | Simple, sufficient for MVP scope |
| **Forms** | React Hook Form + Zod | 7.73.1 / 4.3.6 | Declared but not yet used in UI |
| **File Upload** | react-dropzone | 15 | Drag-and-drop file upload |
| **Panel Layout** | react-resizable-panels | 4.11.0 | Draggable resizable panels with localStorage persistence |

## Backend Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Runtime** | Node.js (via Next.js) | - | Unified TypeScript stack |
| **API Layer** | Next.js API Routes + Server Actions | - | Collocated with frontend, type-safe |
| **Database** | SQLite | - | Local dev via better-sqlite3 |
| **ORM** | Prisma | 7.8.0 | Schema, migrations, client |
| **Auth** | Supabase Auth (`@supabase/ssr`) | - | Email/password + Google OAuth, cookie-based PKCE |

## AI & Content Processing

| Function | Technology | Notes |
|----------|-----------|-------|
| **AI Model** | OpenAI gpt-4o-mini | Via `@ai-sdk/openai` + Vercel AI SDK v6 |
| **PDF Text Extraction** | pdf-parse | Client-side JS, no Python service needed |
| **CEFR Detection** | OpenAI gpt-4o-mini + heuristic fallback | Heuristic uses avg sentence length + complex word ratio |
| **Content Simplification** | OpenAI gpt-4o-mini | Simplifies to one CEFR level below |
| **Question Generation** | OpenAI gpt-4o-mini | 5 MC/TF questions with source citations, Zod schema |

## Flashcard System

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Algorithm** | SM-2 (SuperMemo 2) | Standalone module + inline in db-utils |
| **Card Formats** | Multiple Choice, True/False | With source text citations |
| **Progress Tracking** | Custom SQLite schema | Retention rate, mature cards (21+ day interval), streaks |

## Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety, strict mode |
| ESLint | Code quality (eslint-config-next) |
| Prisma | Database ORM & migrations |
| PostCSS | Tailwind CSS processing |
| Pino | Structured server-side logging |
| Sentry (@sentry/nextjs) | Error tracking, performance monitoring, log forwarding |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │  Upload   │  │  Reading  │  │  Flashcard│  │Progress│ │
│  │  Page     │  │  View     │  │  Test     │  │Dashboard│ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘ │
└───────┼───────────────┼──────────────┼────────────┼──────┘
        │               │              │            │
        ▼               ▼              ▼            ▼
┌──────────────────────────────────────────────────────────┐
│              API Routes + Server Actions                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │ /upload  │  │ /cards/*  │  │/session  │  │/progress│ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘ │
└───────┼───────────────┼──────────────┼────────────┼──────┘
        │               │              │            │
   ┌────┴────┐    ┌─────┴─────┐       │            │
   ▼         ▼    ▼           ▼       ▼            ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Gemini│ │pdf-  │ │Prisma│ │ SM-2 │ │Prisma│ │Prisma│
│  AI  │ │parse │ │Client│ │Algo  │ │Client│ │Client│
└──────┘ └──────┘ └──┬───┘ └──────┘ └──┬───┘ └──┬───┘
                       │                  │        │
                       ▼                  ▼        ▼
                    ┌─────────────────────────────────┐
                    │          SQLite Database         │
                    │  Users | Passages | Questions   │
                    │  CardReviews | StudySessions    │
                    └─────────────────────────────────┘
```

---

## Key Dependencies (package.json)

**Production:**
- `next` 16.2.4, `react` 19.2.4, `react-dom` 19.2.4
- `@ai-sdk/openai` ^3.0.58, `ai` ^6.0.168
- `@prisma/client` ^7.8.0, `@prisma/adapter-better-sqlite3` ^7.8.0, `better-sqlite3` ^12.9.0
- `zod` ^4.3.6, `pdf-parse` ^2.4.5, `react-dropzone` ^15.0.0
- `lucide-react` ^1.8.0, `class-variance-authority` ^0.7.1, `clsx` ^2.1.1, `tailwind-merge` ^3.5.0
- `react-resizable-panels` ^4.11.0
- `@supabase/supabase-js` ^2.x, `@supabase/ssr` ^0.x
- `dotenv` ^17.4.2, `shadcn` ^4.4.0

**Unused (declared but not used):**
- `react-hook-form`, `@hookform/resolvers`, `date-fns`, `@base-ui/react`

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | SQLite connection | `file:./dev.db` |
| `OPENAI_API_KEY` | OpenAI API access | None (required) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | None (required for auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key | None (required for auth) |

---

## Migration Path

| Phase | Status | Scope |
|-------|--------|-------|
| **Phase 1** | **Completed** | Text + PDF upload, CEFR detection, simplification, flashcards, progress |
| **Phase 2** | **Completed** | Sentry integration (errors, server actions), Pino logging |
| **Phase 3** | **Completed** | Pino→Sentry log forwarding, `Sentry.startSpan()` performance monitoring for AI/DB ops |
| **Phase 4** | **Completed** | Sentry source maps upload for production debugging |
| **Phase 5** | Planned | YouTube transcription (Whisper), scanned PDF OCR |
| **Phase 6** | **In Progress** | Resizable study workspace, AI provider switch to OpenAI, advanced analytics |
| **Phase 7** | **In Progress** | Supabase Auth, middleware route protection |
| **Phase 8** | Future | PostgreSQL migration, Vercel deployment |

---

## Unresolved Questions

1. PDF size limits for production (currently 10MB)
2. YouTube video length constraints for Phase 5
3. PostgreSQL migration timing (from SQLite)
4. Offline capability requirements

---

**Status:** Active
**Last Updated:** 2026-05-07

---
**Note:** AI provider switched from Google Gemini to OpenAI gpt-4o-mini, `@ai-sdk/google` still in package.json but unused, `@ai-sdk/openai` now used in all AI modules
