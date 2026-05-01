# Code Standards

**English Reading Training App**

---

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

```
src/
├── app/                  # Next.js App Router (pages, layouts, routes)
│   ├── (dashboard)/      # Route group — no shared layout yet
│   ├── actions/          # Server actions (orchestrators)
│   └── api/              # REST API routes
├── components/
│   ├── ui/               # shadcn/ui primitives (don't modify directly)
│   └── *.tsx             # App-specific components
└── lib/
    ├── *.ts              # Utility modules
    └── ai/               # AI service modules
```

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
- Use `cn()` from `lib/utils.ts` for conditional class merging
- shadcn/ui primitives from `components/ui/` — don't modify, compose instead

---

## Styling

- Tailwind CSS 4 utility classes
- `cn(clsx(...), tailwindMerge(...))` for conditional styles
- No inline styles unless dynamic (e.g., calculated values)
- No CSS modules or styled-components
- Dark mode: use Tailwind `dark:` variant (theme in `globals.css`)

---

## API Routes

- REST conventions: POST for create, GET for read, PATCH for partial update
- Validate input at route boundary with Zod
- Return proper HTTP status codes (200, 201, 400, 404, 500)
- Return JSON: `{ success: boolean, data?: T, error?: string }`
- All routes currently use hardcoded `demo@example.com` user

---

## Database (Prisma)

- Schema defined in `prisma/schema.prisma`
- Use `prisma.config.ts` for configuration
- Run migrations via `npx prisma migrate dev`
- DB operations centralized in `lib/db-utils.ts`
- Prisma client singleton in `lib/db.ts`

### Query Patterns

- Use `prisma.$transaction()` for multi-step writes
- Prefer `findFirst` over `findUnique` when unique constraint isn't guaranteed
- Select only needed fields with `select` when performance matters
- Use `include` for relations, avoid N+1 with explicit joins

---

## AI Integration

- All AI calls go through Vercel AI SDK (`ai` package)
- Model: Google Gemini 1.5 Flash via `@ai-sdk/google`
- Zod schemas for structured AI output
- Fallback heuristics when AI fails (e.g., CEFR detector)
- AI modules in `lib/ai/` — one file per capability

---

## Error Handling

- Try/catch at API route and server action boundaries
- Return user-friendly error messages, log details server-side
- Don't expose stack traces to client
- Validate input early (upload-validator.ts pattern)
- Use `log.error({ err: error }, message)` (Pino) for server-side logging
- Use `Sentry.captureException(error, { tags: { route, method } })` in API routes
- Use `Sentry.withServerActionInstrumentation()` to wrap server actions
- Use `Sentry.addBreadcrumb()` to track AI/DB operations with category and level
- Use `Sentry.startSpan({ name, op }, fn)` for performance monitoring of AI (`op: 'ai'`) and DB (`op: 'db'`) operations

---

## Imports Order

```typescript
// 1. React / Next.js
import { useState } from "react"

// 2. External packages
import { prisma } from "@/lib/db"

// 3. Internal modules
import { cn } from "@/lib/utils"
import { calculateSM2Interval } from "@/lib/sm2-algorithm"

// 4. Types
import type { CEFRLevel } from "@/lib/cefr-utils"
```

---

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`
- No AI references in commit messages
- Keep commits focused on actual code changes
- Don't commit `.env` files or secrets

---

## What Not to Do

- Don't create new files when existing ones can be updated
- Don't add features beyond the current task scope
- Don't use `@ts-ignore` or `@ts-expect-error` without justification
- Don't import from `@prisma/client` directly in components (use db-utils)
- Don't hardcode strings that should be constants or config
- Don't duplicate logic (check existing utils before writing new)

---

**Status:** Active
**Last Updated:** 2026-05-01
