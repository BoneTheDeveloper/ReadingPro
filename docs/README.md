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
| [Product](Product/product-requirements%20.md) | Why does this exist, and what are we building? | [Product requirements](Product/product-requirements%20.md), [feature scope](Product/feature-scope.md), [changelog](Product/changelog.md). |
| [Requirements](Requirements/use-cases.md) | What must it do, from the user's point of view? | [Business](Requirements/business-requirements.md) + [software](Requirements/software-requirements.md) requirements, black-box [use cases](Requirements/use-cases.md), [user stories](Requirements/user-stories/README.md). |
| [Design](Design/design.md) | What is the visual system? | [Design guidelines](Design/design.md), [Dark-mode color design](Design/design.dark.md). |
| [Architecture](Architecture/README.md) | How is it built? | [Architecture index](Architecture/README.md): system overview + ownership map for runtime, frontend UI, backend, auth, storage, observability. Frontend has a [screen architecture](Architecture/frontend-ui-architecture/README.md) + [component catalog](Architecture/frontend-ui-architecture/component-catalog.md). |
| [API](API/api-index.md) | What are the request/response contracts? | [API index](API/api-index.md) (route inventory) + [implementation conventions](API/api-implementation-conventions.md), and per-feature route docs. |
| [Flows](Flows/README.md) | How does a request travel through the code, and how does the user move through the UI? | Two lenses: [data flows](Flows/data-flows/) (white-box UI-to-persistence call path per feature) and [UI flows](Flows/ui-flows/) (UX — [navigation](Flows/ui-flows/navigation-flow.md) page-to-page + [interaction](Flows/ui-flows/overall-ui-flows.md) in-screen). |
| [Testing](Testing/testing-strategy.md) | How do we verify it? | [Test scenarios](Testing/test-scenarios.md), [Traceability matrix](Testing/traceability-matrix.md), [Contract tests](Testing/contract-tests.md). Suite structure + naming rules live in [`tests/README.md`](../tests/README.md). |



## Source of Truth Rules

Per the **Core rule** above, each concern has one canonical owner; every other doc links to
it and never restates it. This table is the registry of who owns what.

| Concern | Canonical owner |
|---------|-----------------|
| Product vision (problem, solution, users, goal, success metrics) | [`Product/product-requirements .md`](Product/product-requirements%20.md) |
| Business case (objective, value props, business model) | [`Requirements/business-requirements.md`](Requirements/business-requirements.md) |
| Feature scope (in / out of scope) | [`Product/feature-scope.md`](Product/feature-scope.md) |
| API route inventory | [`API/api-index.md`](API/api-index.md) |
| API implementation and contracts | [`API/api-implementation-conventions.md`](API/api-implementation-conventions.md) |
| Backend service/repository placement | [`Architecture/backend-architecture.md`](Architecture/backend-architecture.md) |
| Page and feature UI composition | [`Architecture/frontend-ui-architecture/page-composition-conventions.md`](Architecture/frontend-ui-architecture/page-composition-conventions.md) |
| Reusable UI component inventory (variants, states, anatomy) | [`Architecture/frontend-ui-architecture/component-catalog.md`](Architecture/frontend-ui-architecture/component-catalog.md) |
| Visual system (tokens, color, typography, motion) | [`Design/design.md`](Design/design.md) |
| External/actor behavior (black-box use cases) | [`Requirements/use-cases.md`](Requirements/use-cases.md) |
| Internal request/data path (white-box data flows) | [`Flows/data-flows/`](Flows/data-flows/) |
| Page-to-page navigation (UX) | [`Flows/ui-flows/navigation-flow.md`](Flows/ui-flows/navigation-flow.md) |
| In-screen interaction (UX UI flows) | [`Flows/ui-flows/overall-ui-flows.md`](Flows/ui-flows/overall-ui-flows.md) |
