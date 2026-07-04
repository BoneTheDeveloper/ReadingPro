# Architecture

This folder answers **"how is the system built?"** and is the index for the architecture docs.
The sections below are the system-wide overview; the [Architecture Docs](#architecture-docs)
map says **which file owns what** so you edit one place and never duplicate.

## Overview

```text
Browser
  Next.js client components, Clerk UI/session, study workspace
    |
    v
Next.js App Router
  Server Components, server actions, route handlers, proxy middleware
    |
    +-- Clerk: identity, sessions, OAuth
    +-- Neon Postgres: app data, dictionary, progress
    +-- Prisma 7: typed DB client and migrations
    +-- Vercel Blob: private preview/production file storage
    +-- Local blob adapter: development file storage
    +-- AI SDK providers: simplification, questions, study chat
    +-- Sentry + Pino: errors, spans, logs, performance diagnostics
```

The application is a server-first Next.js product. User-facing pages are locale-prefixed, authenticated dashboard routes. Mutations are implemented with standard HTTP route handlers that call server-side domain modules.

## Main Boundaries

The system splits into a routing/auth middleware (`src/proxy.ts`), frontend features
(`src/features/*`), backend modules (`src/server/*`), shared contracts (`src/contracts/*`),
HTTP adapters (`src/app/api/**/route.ts`), and the Prisma data model (`prisma/schema/`).


## Data Ownership

`UserProfile.id` equals the Clerk user id; user-owned tables are filtered by `userId`. The
canonical list of user-owned tables and the enforcement rules live in
[auth-architecture.md](auth-architecture.md#ownership).
