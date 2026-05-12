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

Full rules in this section. Source of truth for token values: `src/app/globals.css` `:root`.

### Color Tokens

Use ONLY these Tailwind classes (mapped from CSS variables in `globals.css`):

| Tailwind Class | CSS Variable | Hex |
|----------------|-------------|-----|
| `bg-primary`, `text-primary` | `--primary` | `#3b5ce4` |
| `text-primary-foreground` | `--primary-foreground` | `#fff` |
| `bg-secondary`, `text-secondary` | `--secondary` | `#5a72f0` |
| `bg-accent`, `text-accent` | `--accent` | `#f0f3ff` |
| `bg-muted`, `text-muted` | `--muted` | `#e7eeff` |
| `text-muted-foreground` | `--muted-foreground` | `#454652` |
| `bg-destructive`, `text-destructive` | `--destructive` | `#ba1a1a` |
| `border-border` | `--border` | `#d8e3fb` |
| `text-foreground` | `--foreground` | `#111c2d` |
| `bg-background` | `--background` | `#f9f9ff` |

### FORBIDDEN Patterns

| Forbidden | Correct |
|-----------|---------|
| `bg-primary-600`, `text-primary-700` | `bg-primary`, `text-primary` |
| `bg-neutral-*`, `text-neutral-*` | `bg-muted`, `text-muted-foreground` |
| Hardcoded hex (`#185FA5`, `#378ADD`) | Theme token classes above |
| `style={{ color: "#..." }}` for static colors | Tailwind classes |
| Raw `<button>` | shadcn `Button` |
| Raw `<input>` | shadcn `Input` |
| Raw `<textarea>` | shadcn `Textarea` |
| Inline SVGs (when Lucide has equivalent) | `import { Icon } from "lucide-react"` |
| `onMouseEnter`/`onMouseLeave` | Tailwind `hover:` classes |
| String concatenation for classes | `cn()` from `@/lib/shared/utils` |

### shadcn/ui Primitives

13 components in `src/components/ui/`: avatar, badge, button, card, dialog, dropdown-menu, input, progress, separator, sheet, tabs, textarea, tooltip.

**Rules:**
- Import and compose — never modify files in `src/components/ui/`
- Use `Card`/`CardContent` for card-like layouts instead of raw `<div>` with border
- Use `Dialog` for modals instead of custom overlay implementations
- Use `Button variant="outline"` or `variant="ghost"` for secondary actions
- Use `Badge` for status indicators and labels

### Acceptable Exceptions

- Dynamic inline styles: `style={{ width: `${percentage}%` }}` (calculated values)
- Error boundary raw buttons: must work if shadcn fails to load (add comment explaining)
- Hidden file inputs: `<input type="file" hidden>` for upload triggers

### Before/After Examples

```tsx
// BAD: hardcoded hex + raw button
<button style={{ color: "#185FA5", background: "#fff" }}>Submit</button>

// GOOD: theme tokens + shadcn Button
<Button variant="outline">Submit</Button>
```

```tsx
// BAD: Tailwind v3 syntax
<div className="bg-primary-600 text-neutral-500">Card</div>

// GOOD: theme tokens
<div className="bg-primary text-muted-foreground">Card</div>
```

```tsx
// BAD: inline SVG
<svg width="16" height="16"><path d="..." /></svg>

// GOOD: Lucide icon
import { Search } from "lucide-react"
<Search className="h-4 w-4" />
```

```tsx
// BAD: JS hover handler
<div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>

// GOOD: Tailwind hover
<div className="hover:bg-accent">
```

- `cn(clsx(...), tailwindMerge(...))` for conditional styles
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
- Prisma client singleton in `lib/db/client.ts`

### Query Patterns

- Use `prisma.$transaction()` for multi-step writes
- Prefer `findFirst` over `findUnique` when unique constraint isn't guaranteed
- Select only needed fields with `select` when performance matters
- Use `include` for relations, avoid N+1 with explicit joins

---

## AI Integration

- All AI calls go through Vercel AI SDK (`ai` package)
- Model: OpenAI gpt-4o-mini via `@ai-sdk/openai`
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
import { prisma } from "@/lib/db/client"

// 3. Internal modules
import { cn } from "@/lib/utils"
import { calculateSM2Interval } from "@/lib/algorithms/sm2"

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
- Don't use `bg-primary-600`, `bg-neutral-*`, or any Tailwind v3 color syntax — use theme tokens (`bg-primary`, `bg-muted`, etc.)
- Don't use hardcoded hex colors in JSX — use CSS variable token classes
- Don't use inline SVGs when Lucide has an equivalent icon
- Don't use raw `<button>`/`<input>`/`<textarea>` when shadcn Button/Input/Textarea exist

---

**Status:** Active
**Last Updated:** 2026-05-06
