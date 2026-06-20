# Documentation Index

This is the **map** of the English Reading Training App docs — it tells you where things live, not how to build them. Docs are organized **by the question each folder answers**.

> **Core rule — Single Source of Truth (SSoT).**
> Each concern has exactly **one** canonical owner. Every other doc *links* to that owner
> and never restates its content. When something changes, you update it in one place.

## Cross-cutting docs

These aren't folders, but every section relies on them:

| Doc | Owns |
|-----|------|
| [`code-standards.md`](code-standards.md) | Code conventions and file placement rules. |
| [`codebase-summary.md`](codebase-summary.md) | High-level tour of the codebase. |


## Main Sections

| Section | Question it answers | Contents |
|---------|---------------------|----------|
| [Product](Product/overview-prd.md) | Why does this exist, and what are we building? | [Overview PRD](Product/overview-prd.md), [feature scope](Product/feature-scope.md), [roadmap](Product/roadmap.md), [changelog](Product/changelog.md). |
| [Requirements](Requirements/use-cases.md) | What exactly must it do? | [Business](Requirements/business-requirements.md) + [software](Requirements/software-requirements.md) requirements, [use cases](Requirements/use-cases.md), [user stories](Requirements/user-stories/README.md). |
| [Architecture](Architecture/system-architecture.md) | How is it built? | [System architecture](Architecture/system-architecture.md): runtime, frontend UI, auth, database design, storage, observability, deployment. <!-- TODO: replace with real per-topic file links if these are separate docs --> |
| [API](API/api-index.md) | What are the request/response contracts? | [API index](API/api-index.md) (route inventory) + [implementation conventions](API/api-implementation-conventions.md), and per-feature route docs. |
| [Flows](Flows/upload-flow.md) | How do features behave end-to-end? | UI-to-persistence flow per feature (e.g. [upload flow](Flows/upload-flow.md)), plus page-to-page [navigation flow](Flows/navigation-flow.md). |
| [Testing](Testing/testing-strategy.md) | How do we verify it? | [Strategy](Testing/testing-strategy.md), [test scenarios](Testing/test-scenarios.md), [traceability matrix](Testing/traceability-matrix.md), [contract tests](Testing/contract-tests.md), [performance benchmarks](Testing/performance-benchmarks.md). |
| [Design](Design/design-guidelines.md) | What is the visual system? | [Design guidelines](Design/design-guidelines.md), [styling guide](Design/styling-guide.md), [dark-mode color design](Design/dark-mode-colors.md). <!-- TODO: confirm the styling-guide and dark-mode filenames match your repo --> |



## Source of Truth Rules

Per the **Core rule** above, each concern has one canonical owner; every other doc links to
it and never restates it. This table is the registry of who owns what.

| Concern | Canonical owner |
|---------|-----------------|
| Product vision (problem, solution, users, goal, success metrics) | [`Product/overview-prd.md`](Product/overview-prd.md) |
| Business case (objective, value props, business model) | [`Requirements/business-requirements.md`](Requirements/business-requirements.md) |
| Delivery phases and status | [`Product/roadmap.md`](Product/roadmap.md) |
| Feature scope (in / out of scope) | [`Product/feature-scope.md`](Product/feature-scope.md) |
| API route inventory | [`API/api-index.md`](API/api-index.md) |
| API implementation and contracts | [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md) |
| Page and feature UI composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) |
