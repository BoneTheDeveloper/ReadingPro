# Documentation Governance

Ownership and anti-duplication rules for the docs tree. The [README](README.md) is the
navigation gate (what each folder is, reading order); this file is the rulebook (who owns
what, where the single source lives).

**Core rule:** each concern has exactly one canonical home. Other docs link to it — they
never restate it. When a rule is specific to a folder or executable asset, keep the detailed
rule in that folder and reference it from here, not the other way around.

## Source Of Truth Rules

| Concern | Canonical owner | Everyone else |
|---------|-----------------|---------------|
| Product vision (problem, solution, users, goal, success metrics) | [`Product/overview-prd.md`](Product/overview-prd.md) | Link only; never restate. |
| Business case (objective, value props, business model) | [`Requirements/business-requirements.md`](Requirements/business-requirements.md) | Link only; defers vision to PRD, phases to roadmap. |
| Delivery phases and status | [`Product/roadmap.md`](Product/roadmap.md) | Link only; never re-list phases. |
| Feature scope (in / out of scope) | [`Product/feature-scope.md`](Product/feature-scope.md) | Link only; never re-list scope. |
| API route inventory | [`API/api-index.md`](API/api-index.md) | Link only; never re-list routes. |
| API implementation and contracts | [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md), [`API/api-index.md`](API/api-index.md) | Detailed route behavior stays in API docs. |
| Code and file placement | [`code-standards.md`](code-standards.md), [`codebase-summary.md`](codebase-summary.md) | Keep broad conventions and feature map only. |
| Page and feature UI composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) | Link and summarize only. |
| Database schema, columns, relations | [`../prisma/schema/`](../prisma/schema/) | Docs cover identifier policy and enum catalogs only. |
| Prisma migration procedure | [`../prisma/migrations-guide.md`](../prisma/migrations-guide.md), [`../prisma/SECURITY.md`](../prisma/SECURITY.md) | Link and summarize only. |
| Test suite structure | [`../tests/README.md`](../tests/README.md) | Link and summarize only. |
| Performance query budgets | [`../tests/performance/query-budget-benchmarks.md`](../tests/performance/query-budget-benchmarks.md), [`../tests/performance/README.md`](../tests/performance/README.md) | Link and summarize only. |
