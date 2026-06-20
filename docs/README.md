# Documentation Index

Start here when onboarding to the English Reading Training App docs.

Docs are organized **by the question each folder answers**. The table below maps each
folder to its question and contents.

## Main Sections

| Section | Question it answers | Contents |
|---------|---------------------|----------|
| [Product](Product/overview-prd.md) | Why & what (strategy) | [Overview PRD](Product/overview-prd.md), [feature scope](Product/feature-scope.md), [roadmap](Product/roadmap.md), [changelog](Product/changelog.md). |
| [Requirements](Requirements/use-cases.md) | What exactly must it do (spec) | [Business](Requirements/business-requirements.md) + [software](Requirements/software-requirements.md) requirements, [use cases](Requirements/use-cases.md), [user stories](Requirements/user-stories/README.md). |
| [Architecture](Architecture/system-architecture.md) | How is it built | Runtime, frontend UI, auth, database design, storage, observability, deployment. |
| [API](API/api-index.md) | Request/response contracts | API conventions and per-feature route docs. |
| [Database](../prisma/schema-conventions.md) | Data contracts | Identifier policy + string-enum catalogs live in [`prisma/schema-conventions.md`](../prisma/schema-conventions.md); schema, columns, and relations are the [`prisma/schema/`](../prisma/schema/) source of truth; migration procedure in [`../prisma/`](../prisma/migrations-guide.md). |
| [Flows](Flows/upload-flow.md) | How features behave end-to-end | UI-to-persistence flow per feature, plus page-to-page [navigation flow](Flows/navigation-flow.md). |
| [Testing](Testing/testing-strategy.md) | How we verify it | [Strategy](Testing/testing-strategy.md), [test scenarios](Testing/test-scenarios.md), [traceability matrix](Testing/traceability-matrix.md), [contract tests](Testing/contract-tests.md), [performance benchmarks](Testing/performance-benchmarks.md). |
| [Design](Design/design-guidelines.md) | Visual system | Design guidelines, styling guide, dark-mode color design. |

## Governance

Doc ownership and the "one canonical home per concern, never restate" rules live in
[doc-governance.md](doc-governance.md). Consult it before adding a section that might
already belong to another doc.
