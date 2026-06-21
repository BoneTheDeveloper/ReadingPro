# Data Flows — Authoring Convention

White-box, implementation-centric flows: *how a request travels through the code*
(route → service → repository → DB rows). The black-box *what* lives in
[use cases](../../Requirements/use-cases.md); the request/response *shape* lives in
[API](../../API/api-index.md). Do not restate either here.

## Per-Route Path Taxonomy (required)

Each route in a data-flow doc is documented under **four distinct lenses**. Write
only the lens content that is *true for that route* — never copy a generic path
between routes. If a lens does not apply to a route, write `None` and one line on
why, rather than padding it.

| Lens | Answers | What to write |
|------|---------|---------------|
| **Happy Path** | What happens when everything is valid and succeeds? | The single normal traversal, route → persistence, ending in the success response. |
| **Exception Flow** | What handled failures exist and what does the caller get back? | Each rejected/aborted path with its status + stable `{ error }` payload (validation, auth, ownership miss, provider failure). |
| **Edge Case / Boundary Condition** | What unusual-but-valid inputs change the outcome? | Limits, empty/null fields, normalization boundaries, idempotency, dedup keys, "same vs different" decisions. |
| **Race Condition** | What happens under concurrent or repeated requests? | Double-submit, concurrent upsert, lazy create races — and the mechanism that resolves them (unique constraint, atomic upsert, in-flight guard). Write `None` if the route is read-only and side-effect-free. |

## Route-Specificity Rule

- **One route, one set of paths.** A doc covering several routes gives each route its
  own four lenses. The translate route's edge cases are not the vocabulary route's.
- **No shared boilerplate.** "Validate → auth → query" is implied; document only what
  is *distinctive* about this route's traversal.

## Ambiguity Rule (the important one)

When a route's *intended* behavior is not obvious — the kind of "should it dedup or
duplicate? merge or split? bump or no-op?" question that confuses a reader — the
data flow **must state the resolution explicitly**, not leave it to the code. Write
the decision and the reason in the relevant lens (usually Edge Case or Race
Condition), so the doc answers *"how should it behave"* and not just *"what the code
currently does."*

## Skeleton

```markdown
# <Feature> Data Flow

Covers: UC-XX. Routes: `METHOD /api/...`

## `METHOD /api/route`

### Happy Path
<the normal successful traversal>

### Exception Flow
| Trigger | Status | Response |
|---------|--------|----------|
| ... | ... | `{ error: "..." }` |

### Edge Case / Boundary Condition
<unusual-but-valid inputs and how they resolve>

### Race Condition
<concurrent/repeat behavior and the resolving mechanism — or `None` + why>

## Persistence
<tables written, keys, side effects>

## Code Paths
| Responsibility | File |
```

## Migration Note

Existing flow docs predate this convention and may still use a single linear
narrative. Migrate them to the four-lens, per-route structure when you next touch
the feature. New flow docs follow this convention from the start.
