# Documentation Governance
**Core rule:** each concern has exactly one canonical home. Other docs link to it — they
never restate it. When a rule is specific to a folder or executable asset, keep the detailed
rule in that folder and reference it from here, not the other way around.

## Source Of Truth Rules

Each concern has one canonical owner. Per the core rule above, every other doc links to
it and never restates it — only owner-scope nuances worth calling out are noted below.

| Concern | Canonical owner | Scope notes |
|---------|-----------------|-------------|
| Product vision (problem, solution, users, goal, success metrics) | [`Product/overview-prd.md`](Product/overview-prd.md) | — |
| Business case (objective, value props, business model) | [`Requirements/business-requirements.md`](Requirements/business-requirements.md) | Defers vision to PRD, phases to roadmap. |
| Delivery phases and status | [`Product/roadmap.md`](Product/roadmap.md) | — |
| Feature scope (in / out of scope) | [`Product/feature-scope.md`](Product/feature-scope.md) | — |
| API route inventory | [`API/api-index.md`](API/api-index.md) | — |
| API implementation and contracts | [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md), [`API/api-index.md`](API/api-index.md) | Detailed route behavior stays in API docs. |
| Code and file placement | [`code-standards.md`](code-standards.md), [`codebase-summary.md`](codebase-summary.md) | Broad conventions and feature map only. |
| Page and feature UI composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) | — |
| Database schema, columns, relations | [`../prisma/schema/`](../prisma/schema/) | Identifier policy and enum catalogs only. |
| Prisma migration procedure | [`../prisma/migrations-guide.md`](../prisma/migrations-guide.md), [`../prisma/SECURITY.md`](../prisma/SECURITY.md) | — |
| Test suite structure | [`../tests/README.md`](../tests/README.md) | — |
| Performance query budgets | [`../tests/performance/query-budget-benchmarks.md`](../tests/performance/query-budget-benchmarks.md), [`../tests/performance/README.md`](../tests/performance/README.md) | — |
