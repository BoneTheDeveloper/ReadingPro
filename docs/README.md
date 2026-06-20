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
| [Requirements](Requirements/use-cases.md) | What must it do, from the user's point of view? | [Business](Requirements/business-requirements.md) + [software](Requirements/software-requirements.md) requirements, black-box [use cases](Requirements/use-cases.md), [user stories](Requirements/user-stories/README.md). |
| [Architecture](Architecture/system-architecture.md) | How is it built? | [System architecture](Architecture/system-architecture.md): runtime, frontend UI, auth, database design, storage, observability, deployment. <!-- TODO: replace with real per-topic file links if these are separate docs --> |
| [API](API/api-index.md) | What are the request/response contracts? | [API index](API/api-index.md) (route inventory) + [implementation conventions](API/api-implementation-conventions.md), and per-feature route docs. |
| [Flows](Flows/README.md) | How does a request travel through the code to make it happen? | White-box [flows index](Flows/README.md): UI-to-persistence call path per feature, plus page-to-page [navigation flow](Flows/navigation-flow.md). |
| [Testing](Testing/testing-strategy.md) | How do we verify it? | [Strategy](Testing/testing-strategy.md), [test scenarios](Testing/test-scenarios.md), [traceability matrix](Testing/traceability-matrix.md), [contract tests](Testing/contract-tests.md). Suite structure + naming rules live in [`tests/README.md`](../tests/README.md); query budgets in [`tests/performance/README.md`](../tests/performance/README.md). |
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
| External/actor behavior (black-box use cases) | [`Requirements/use-cases.md`](Requirements/use-cases.md) |
| Internal request/data path (white-box flows) | [`Flows/`](Flows/README.md) |
