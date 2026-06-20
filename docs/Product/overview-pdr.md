# Project Overview PDR

## Product

English Reading Training App is an AI-assisted reading trainer for English learners. A learner uploads or pastes English content, studies the passage in a guided workspace, translates selected text, asks passage-grounded study questions, and reviews generated cards through spaced repetition.

## Users

The product targets a single user: the **independent learner**.

| User | Need |
|------|------|
| Independent learner | Read self-chosen English content to learn new English (vocabulary, language, usage) and to understand the given passage more deeply, with level-appropriate support and retention tracking. |


## Problem

Reading apps and vocabulary-learning apps exist separately and do not reinforce each other. Reading tools help a learner get through a passage but drop the new words once the page is closed. Flashcard apps drill words in isolation, stripped of the context where the learner first met them.

So the learner has no single flow that connects the two. New words stay tied to nothing, which makes them hard to remember. The learner needs each new word to keep the context of the passage it came from, so it can be reinforced twice — once while reading, and again through a spaced-repetition card-set loop — instead of being memorized as a context-free entry.

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

- Use cases: [../Requirements/use-cases.md](../Requirements/use-cases.md)
- Feature scope: [feature-scope.md](feature-scope.md)
- System architecture: [../Architecture/system-architecture.md](../Architecture/system-architecture.md)
- Roadmap: [roadmap.md](roadmap.md)

**Status:** Active
**Last Updated:** 2026-06-06
