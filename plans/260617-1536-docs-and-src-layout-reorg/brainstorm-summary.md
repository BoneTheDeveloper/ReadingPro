# Brainstorm Summary — Docs Reorg + Src Layer Re-naming

Date: 2026-06-17
Status: Approved, ready for `/ck:plan`

## Problem Statement

Two problems, both about clarity for agents/humans:

1. **Docs**: requirements docs sit in wrong folder; use-cases duplicated (no single
   source of truth); missing industry-standard docs (user stories, test scenarios,
   traceability); broken nav links; general convention doc not clearly the place
   agents look (and over-detailed in places).
2. **Src layout**: layer/folder names do not describe role or position; `core`/`domain`
   ambiguous; `api` overloaded 4 ways. Import-path convention undocumented.

## Hard Constraints

- `src/app/` is **Next.js reserved** — cannot be renamed. Full re-naming applies only to
  `server / shared / features / components` and their sub-folders.
- ~395 alias imports (`@/`, `@/server/*`, `@/shared/*`) + 115 relative. Top-level rename =
  mass import rewrite + `tsconfig.json` paths update.
- Out of scope: changing code logic, test content, prisma schema.

## Approved Decisions

| Topic | Decision |
|-------|----------|
| Scope | Both docs + src. Sequence: docs first (low risk), then src rename as isolated plan. |
| Requirements SSOT | New `docs/Requirements/` folder. |
| Product folder | Clarify role: Product = scope/assumptions only; requirements move out. |
| Src naming | **Scheme 1: Role rename.** |
| Convention SSOT | Lean `docs/code-standards.md` as the single hub; CLAUDE.md points here. |
| New docs | user-stories, test-scenarios, traceability-matrix. |
| Import rule | Document in code-standards.md **+ ESLint enforce**; fix 2 existing violations. |

## Part A — Docs

### A1. New `docs/Requirements/` (single source of truth)
```
docs/Requirements/
  business-requirements.md   (move from Database/brd.md)
  software-requirements.md   (move from Database/srs.md)
  use-cases.md               (MERGE Database/use-case.md + Product/use-cases.md)
  user-stories.md            (NEW)
  test-scenarios.md          (NEW)
  traceability-matrix.md     (NEW: story -> use-case -> API route -> test)
```
`docs/Database/` keeps only schema/ERD/migration/data-dictionary/neon-contract.

### A2. Clarify `docs/Product/`
Product = MVP scope + product assumptions only (`feature-scope.md`). Requirements
content removed. Make folder role self-describing.

### A3. Lean convention hub
`docs/code-standards.md` stays THE general convention doc. Trim to clear tables +
valid links only; remove codebase minutiae. Add the import-path convention (Part C).

### A4. Fix broken nav
Repair/remove dead links in `docs/README.md` and `tests/README.md`
(`Operations/root-configuration.md`, `Operations/local-development.md`,
`prisma/migrations-guide.md`, `playwright/README.md`, `docs/quality-assurance/`, etc.).
Either create the referenced files or drop the links.

## Part B — Src Layer Re-naming (Scheme 1: Role rename)

| Role | Current | New |
|------|---------|-----|
| Route/handler entry | `src/app` | `src/app` *(locked, Next.js)* |
| Design-system primitives | `src/components` | `src/ui` |
| Frontend feature modules | `src/features` | `src/features` *(already clear)* |
| Pure contracts (Zod/DTO/utils) | `src/shared` | **`src/contracts`** |
| Backend (server-only) | `src/server` | `src/server` *(already clear)* |
| response schema/utils | `shared/api` | `contracts/http` |
| feature fetchers | `features/*/api` | `features/*/api-client` *(validated; was `data`)* |
| logger | `server/core` | merge into `server/observability` |
| sentry helper | `shared/core` | `contracts/observability` |
| cefr | `shared/domain` | `contracts/domain` |

Mechanical execution: update `tsconfig.json` paths, rewrite ~395 alias imports,
land in one isolated commit gated by `typecheck && lint && test` green.

## Part C — Import-Path Convention

> Use `@/` alias when an import crosses a module/feature/layer boundary.
> Use relative (`./`, `../`) only within the same module/feature folder.

- Already de-facto true (395 alias vs 115 relative; only 2 violations).
- Document in `code-standards.md`.
- Enforce via ESLint (`no-restricted-imports` / import boundaries).
- Fix the 2 `../../../tests/...` violations.
- Synergy: alias imports survive folder renames (swap alias segment); relative
  intra-module imports unaffected when a folder moves as a unit.

## Acceptance Criteria

- `docs/Requirements/` exists with 6 docs; no duplicate use-cases anywhere.
- `docs/Database/` holds only DB docs; `docs/Product/` holds only scope/assumptions.
- `docs/code-standards.md` is lean, links all resolve, contains import-path rule.
- No broken links in `docs/README.md` / `tests/README.md`.
- Src renamed per Scheme 1; `tsconfig.json` updated; `typecheck && lint && test` green.
- ESLint flags cross-boundary relative imports; 2 existing violations fixed.

## Risks

- Src rename churn (~395 imports) — mitigate: single isolated commit + green gate.
- Doc link rot during move — mitigate: link-check pass after reorg.
- ESLint rule false positives — mitigate: scope rule to src/ layer boundaries.

## Open Questions

None.
