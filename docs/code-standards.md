# Code Standards

## General Principles

- **YAGNI** — Don't build for hypothetical future requirements
- **KISS** — Simple solutions over clever abstractions
- **DRY** — Extract shared logic, but don't over-abstract
- Files under 200 lines — split if larger

---

## TypeScript

- Strict mode enabled (`tsconfig.json`)
- Prefer `interface` over `type` for object shapes
- No `any` — use `unknown` and narrow with type guards
- Export types from their definition file, not from barrel exports
- Use Zod schemas for runtime validation at API boundaries

---

## File Naming

| Category | Convention | Examples |
|----------|-----------|---------|
| Components | kebab-case | `upload-zone.tsx`, `progress-dashboard.tsx` |
| Pages | Next.js convention | `page.tsx`, `layout.tsx` |
| Utilities | kebab-case, descriptive | `cefr-utils.ts`, `reading-utils.ts`, `upload-validator.ts` |
| API routes | Next.js convention | `route.ts` inside `api/cards/review/` |
| AI modules | kebab-case | `cefr-detector.ts`, `content-simplifier.ts` |
| CSS | kebab-case | `globals.css` |

**Self-documenting names preferred** — long filenames OK if purpose is clear from the name.

---

## Project Structure Conventions

### Ownership Boundaries

| Code | Path |
|------|------|
| UI generic primitives | `src/components/ui/` |
| Layout and shell UI | `src/components/layout/` |
| Logic for one feature | `src/features/<name>/` |
| DB, AI, parser, storage, auth, validation, shared infrastructure | `src/lib/` |
| Route entrypoints | `src/app/` |

Keep `src/app/` focused on routing: `page.tsx`, `layout.tsx`, `error.tsx`, and API `route.ts` files should be thin adapters that load data and render feature components or call feature/lib services. If a file contains workflow UI, server actions, feature-specific types, or single-feature logic, place it under `src/features/<name>/`.

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up
│   ├── (dashboard)/      # Authenticated route entrypoints
│   ├── auth/callback/    # OAuth callback
│   └── api/              # REST: cards/, progress/, study-session/, upload/
├── components/
│   ├── ui/               # shadcn/ui primitives (don't modify)
│   └── layout/           # Sidebar, header/account shell, layout-owned hooks
├── features/
│   ├── progress/         # Progress dashboard feature UI
│   ├── reading/          # Reading view feature UI
│   ├── study/            # Study workspace UI, types, and study server actions
│   ├── test/             # Flashcard test UI and types
│   └── upload/           # Upload/processing UI and upload analysis action
└── lib/
    ├── ai/               # AI service modules and prompt helpers
    ├── algorithms/       # SM-2 spaced repetition
    ├── auth/             # Auth utilities
    ├── core/             # Logger, Sentry
    ├── db/               # Prisma client + queries
    ├── parsers/          # File parsing (PDF, text)
    ├── shared/           # Shared utils (cn(), etc.)
    ├── storage/          # File storage
    ├── supabase/         # Auth clients
    └── validation/       # Zod schemas
```

### `lib/` Discoverability

`src/lib/` is for code that is reused across features or wraps infrastructure. Do not use it as a miscellaneous folder.

- `lib/ai/` — model calls, prompt helpers, generated content parsing
- `lib/auth/` — auth/session/profile helpers
- `lib/core/` — logging, Sentry, process-level infrastructure
- `lib/db/` — Prisma client and query modules
- `lib/parsers/` — reusable file/content parsers
- `lib/storage/` — storage adapters
- `lib/supabase/` — Supabase clients and middleware/session helpers
- `lib/validation/` — shared validators and schemas used at boundaries
- `lib/shared/` — tiny pure helpers only, such as `cn()` and display utilities
- `lib/algorithms/` — reusable algorithms independent of a single feature

If a utility is only used by one feature, keep it in `src/features/<name>/`. Move it into `lib/` only when a second feature or route needs the same behavior.

---

## Components

### Server vs Client Components

- Default to Server Components
- Add `"use client"` only when state/effects/event handlers needed
- Keep client components thin — fetch data in server components, pass as props

### Component Patterns

- Functional components only (no class components)
- Props interface defined above the component or inline
- Destructure props in function signature
- Use `cn()` from `lib/shared/utils.ts` for conditional class merging
- shadcn/ui primitives from `components/ui/` — don't modify, compose instead
- Layout shell components and layout-owned hooks live in `components/layout/`
- Feature components live beside their workflow in `features/<name>/`

## Project-Specific Rules

- API responses: `{ success: boolean, data?: T, error?: string }`
- shadcn/ui primitives in `src/components/ui/` — compose, don't modify
- Import `db` from `@/lib/db/client` — never use generated Prisma client imports directly in components
- Avoid feature-to-feature imports. Promote shared behavior to `lib/` only after it is genuinely reused.
- Avoid broad barrel exports for `features/` and `lib/`; import from the owning module so ownership remains visible.

## Error Handling

- Try/catch at API route and server action boundaries
- `log.error({ err: error }, message)` (Pino) for server-side logging
- `Sentry.captureException(error, { tags: { route, method } })` in API routes
- `Sentry.withServerActionInstrumentation()` to wrap server actions
- `Sentry.addBreadcrumb()` to track AI/DB operations
- `Sentry.startSpan({ name, op }, fn)` for AI (`op: 'ai'`) and DB (`op: 'db'`) performance

## Prisma Query Patterns

- `prisma.$transaction()` for multi-step writes
- Prefer `findFirst` over `findUnique` when unique constraint isn't guaranteed
- Select only needed fields with `select` when performance matters
- Use `include` for relations, avoid N+1

---

**Status:** Active
**Last Updated:** 2026-05-15
