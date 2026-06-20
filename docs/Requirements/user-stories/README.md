# User Stories

**English Reading Training App**

User stories organized as a three-tier story map — **Epic → Story → Acceptance Criteria** —
following INVEST and BDD (Given/When/Then) practice. Each epic maps to a Solution area in
the [Product PDR](../../Product/overview-pdr.md). Stories back-link to their use case in
[use-cases.md](../use-cases.md).

## Format

Each story carries:

- **Statement** — `As a <role>, I want <capability>, so that <benefit>`.
- **Priority** — MoSCoW (Must / Should / Could / Won't this round).
- **Status** — Implemented / Planned.
- **Acceptance criteria** — Gherkin scenarios for core and edge behavior; bullets for minor
  UI / non-functional notes.
- **Traceability** — links to use case, feature-scope area, and test scenarios.

## Epics

| Epic | Title | PRD Solution area | Stories | File |
|------|-------|-------------------|---------|------|
| EP-01 | Content Import | 1. Bring any passage | US-01..US-05 | [epic-01-content-import.md](epic-01-content-import.md) |
| EP-02 | Study & Comprehension | 2. Check understanding | US-06..US-09 | [epic-02-study-comprehension.md](epic-02-study-comprehension.md) |
| EP-03 | Passage Chat | 3. Go deeper through chat | US-10..US-11 | [epic-03-passage-chat.md](epic-03-passage-chat.md) |
| EP-04 | Vocabulary Capture | 4. Capture words | US-12..US-15 | [epic-04-vocabulary-capture.md](epic-04-vocabulary-capture.md) |
| EP-05 | Memorization & Review | 5. Memorize them | US-16..US-19 | [epic-05-memorization-review.md](epic-05-memorization-review.md) |
| EP-06 | Account & Access | (cross-cutting) | US-20..US-21 | [epic-06-account-access.md](epic-06-account-access.md) |
| EP-07 | Progress & Insights | Success metrics | US-22 | [epic-07-progress-insights.md](epic-07-progress-insights.md) |

## Coverage

Every use case in [use-cases.md](../use-cases.md) (UC-01..UC-12) maps to at least one story.
Stories without a use case yet (YouTube/web/OCR import, standalone translate page) are marked
**Planned** and flag a use case to author. Test coverage per story is tracked in
[../../Testing/test-scenarios.md](../../Testing/test-scenarios.md) and
[../../Testing/traceability-matrix.md](../../Testing/traceability-matrix.md).

**Last Updated:** 2026-06-20
