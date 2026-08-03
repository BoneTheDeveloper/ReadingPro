# Reading Pro

A study workspace for English learners: bring in a passage from any source, read it in a
focused reader, check comprehension with AI-generated artifacts, capture vocabulary in
context, and review it later.

## Why this exists

Learners collect reading material in many formats (articles, PDFs, YouTube talks) but lose
the study loop: understanding checks, word meaning in context, and repetition. Reading Pro
keeps a passage and everything derived from it — questions, chat, saved words — in one
owned workspace.

## What it does

| Area | Capability |
|---|---|
| [Content import](docs/Requirements/epic-01-content-import.md) | Paste text, upload a PDF, or bring a YouTube link in as a passage |
| [Study & comprehension](docs/Requirements/epic-02-study-comprehension.md) | Generate comprehension questions and flashcards over a passage |
| [Passage chat](docs/Requirements/epic-03-passage-chat.md) | Ask a tutor grounded in the passage you are reading |
| [Vocabulary capture](docs/Requirements/epic-04-vocabulary-capture.md) | Inline translation while reading, then save words with their context |
| [Memorization & review](docs/Requirements/epic-05-memorization-review.md) | Group saved words into sets and review them on a schedule |

Visual language — colors, surfaces, component rules — is defined in
[`docs/design.md`](docs/design.md).

## Tech stack

- **Next.js** (App Router) · **React** · **TypeScript**
- **Tailwind CSS** · **shadcn/ui** (Radix primitives)
- **TanStack Query** for client data
- **Prisma** · **PostgreSQL**
- **Better Auth** (Google sign-in)
- **Vercel AI SDK** for translation, passage processing, questions, and chat
- **Sentry** · **pino** for errors and logs
- **pnpm** · deployed on **Vercel**

## Directory map

```
src/
├─ app/
│  ├─ (marketing)/            # public landing
│  ├─ (auth)/login/           # sign-in
│  ├─ (dashboard)/            # study, vocabulary, account
│  └─ api/                    # route handlers
├─ features/
│  ├─ passage/                # import, preprocessing, library panel
│  ├─ reading/                # reader panel, selection, inline translation
│  ├─ studio/                 # artifacts: questions, flashcards, passage chat
│  └─ vocabulary/             # word bank and sets
├─ component/                 # shared UI (shadcn/ui in component/ui)
├─ lib/                       # auth, prisma, logger, query client, error helpers
└─ generated/prisma/          # generated client — do not edit

docs/                         # product requirements and design system
prisma/schema.prisma          # database schema
```

## Running locally

```bash
pnpm install
cp .env.example .env    # fill in database, auth, and AI gateway values
pnpm prisma db push
pnpm dev                # http://localhost:3000
```

Conventions for transport, file layout, naming, and error handling live in
[CLAUDE.md](CLAUDE.md).
