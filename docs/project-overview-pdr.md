# Project Overview PDR

## Product

English Reading Training App is an AI-assisted reading trainer for English learners. A learner uploads or pastes English content, studies the passage in a guided workspace, translates selected text, asks passage-grounded study questions, and reviews generated cards through spaced repetition.

## Users

| User | Need |
|------|------|
| Independent learner | Practice reading with level-appropriate support and retention tracking. |
| Exam learner | Build comprehension skills for CEFR-oriented study. |
| Teacher or tutor | Turn learner-provided material into questions and study sessions. |

## Problem

Learners often read material that is either too hard, too isolated from vocabulary support, or not connected to long-term review. Generic translation and chat tools do not preserve passage ownership, progress, or review history.

## Solution

The app provides one integrated loop:

```text
Upload or paste content
  -> analyze CEFR level
  -> simplify when useful
  -> generate comprehension questions
  -> study in a three-panel workspace
  -> translate and save vocabulary
  -> review cards with SM-2 scheduling
  -> track progress
```

## Current State

As of 2026-06-06, the MVP is implemented on Next.js App Router with Clerk auth, Neon PostgreSQL through Prisma, local/Vercel Blob storage, AI-assisted study features, Sentry, Pino, and performance test hooks.

Operational features include:

- Text and PDF upload.
- Passage persistence and soft deletion.
- CEFR metadata, simplification, and question generation.
- Three-panel study workspace.
- Inline translation, dictionary lookup/search/suggest, translation cache/history, and vocabulary saving.
- Study chat with streaming AI tutor responses scoped to the selected passage.
- SM-2 review scheduling and progress stats.
- Local, preview, and production environment contracts.

## MVP Scope

In scope:

- Authenticated learner-owned passages.
- English source content and Vietnamese translation/dictionary targets.
- Private file storage abstraction.
- Seeded dictionary data and raw-SQL optimized dictionary reads where needed.
- Production deployment on Vercel with Neon and Vercel Blob.

Out of scope for the current MVP:

- Native mobile apps.
- Payments and subscriptions.
- Collaborative classrooms.
- Audio pronunciation and speech input.
- OCR and YouTube transcription.

## References

- Product flows: [Product/user-flows.md](Product/user-flows.md)
- Feature scope: [Product/feature-scope.md](Product/feature-scope.md)
- System architecture: [Architecture/system-architecture.md](Architecture/system-architecture.md)
- Roadmap: [project-roadmap.md](project-roadmap.md)

**Status:** Active
**Last Updated:** 2026-06-06
