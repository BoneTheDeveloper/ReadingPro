# System Architecture

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

For the detailed boundary map see the per-area docs in [Architecture Docs](#architecture-docs)
below; for the folder-level source layout see [`../codebase-summary.md`](../codebase-summary.md),
and for the non-negotiable boundary invariants see [`../code-standards.md`](../code-standards.md).

## Data Ownership

`UserProfile.id` equals the Clerk user id; user-owned tables are filtered by `userId`. The
canonical list of user-owned tables and the enforcement rules live in
[auth-architecture.md](auth-architecture.md#ownership).

## Core Workflows

End-to-end behavior is owned by the flow and use-case docs, not restated here:

- *What* the user does (black box): [`../Requirements/use-cases.md`](../Requirements/use-cases.md)
- *How* the code fulfills it (white box): [`../Flows/data-flows/`](../Flows/data-flows/)

## Architecture Docs

- Runtime: [runtime-architecture.md](runtime-architecture.md)
- Frontend UI: [frontend-ui-architecture](frontend-ui-architecture/README.md)
- Backend modules (service/repository placement): [backend-architecture.md](backend-architecture.md)
- Auth: [auth-architecture.md](auth-architecture.md)
- Storage: [storage-architecture.md](storage-architecture.md)
- Observability: [observability-architecture.md](observability-architecture.md)
- API contracts: [`../API/api-index.md`](../API/api-index.md) + [implementation conventions](../API/api-implementation-conventions.md)
