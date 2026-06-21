# Code Standards

## Purpose

This file is the top-level convention for writing code and placing files. Keep it broad. Detailed rules belong in the owning architecture, API, testing, database, operations, or folder-local docs.

## General Principles

- Keep boundaries explicit: UI, feature orchestration, API boundaries, domain logic, persistence, and operations should live in their owning layers.
- Prefer the existing project pattern over inventing a new shape.
- Move shared contracts into `src/contracts/<domain>` and backend logic into `src/server/modules/<domain>`.
- Keep framework boundary files thin: pages compose features, routes expose HTTP, features communicate via standard API calls.

## Core Invariants

Non-negotiable boundaries. Breaking one is a bug, not a style choice.

1. **Strict server boundary:** `src/server/` is marked `server-only`. Browser code must not import Prisma, Clerk server APIs, filesystem, or server-only AI modules.
2. **Pure contracts:** `src/contracts/` contains only Zod schemas and types, and never imports from `src/server/`.
3. **Frontend via HTTP only:** `src/features/` communicates with the backend only through standard HTTP API routes. Browser fetch logic lives in feature `api/` clients, not directly in components or hooks.

## Code Style

- Use strict TypeScript and avoid `any`; prefer `unknown` plus narrowing at external boundaries.
- Prefer explicit input and output types at service, route, and shared helper boundaries.
- Use Zod for untrusted input and generated structured output; route handlers must validate all external input using schemas from `src/contracts/`.
- Keep functions small enough that ownership, side effects, and failure paths are obvious.
- Name code by product role or domain responsibility, not by layout position or implementation trivia.
- Add comments only when they clarify non-obvious constraints, invariants, or cross-layer decisions.

## Naming Convention

| Kind | Convention |
|------|------------|
| TypeScript source files | Follow local feature/domain style; prefer kebab-case for new non-component files. |
| React components | PascalCase exports; filenames should match local convention. |
| Hooks | `use-*` names for React hooks. |
| Next.js files | Follow Next.js reserved filenames. |
| Tests | Follow the owning test runner docs. |

## Import Paths

Use the `@/` alias when an import crosses a module, feature, or layer boundary (e.g. `features → contracts`, `server → contracts`, `ui → features`). Use a relative path (`./` or `../`) only within the same module or feature folder. This keeps renames cheap and makes cross-layer dependencies visible at a glance.

## Change Checklist

Before adding or moving code:

- Is this feature-only, shared domain logic, or framework boundary code?
- Is there an existing folder/doc that already owns this convention?
- Will this create a feature-to-feature dependency that should become shared domain code instead?
- Are API/database/test details documented in their canonical docs instead of duplicated here?
- Are generated files and historical records left alone unless the task explicitly targets them?

**Status:** Active
**Last Updated:** 2026-06-20
