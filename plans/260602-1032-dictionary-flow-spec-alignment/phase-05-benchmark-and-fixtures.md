# Phase 5: Add Entry-Detail Benchmark Scenario + Update Fixtures

## Context Links

- Spec: `docs/API/dictionary-flow.md` lines 499-518 (performance budgets table -- 8 scenarios)
- Current benchmark: `tests/performance/dictionary-flow-benchmark.ts`
- Current fixtures: `src/app/api/test/dictionary-performance-fixtures/route.ts`
- New entry detail route from P4: `src/app/api/dictionary/entries/[entryId]/route.ts`
- Performance types from P1: `src/lib/dictionary/dictionary-performance.ts`

## Overview

- Priority: P2
- Status: Pending
- Add 8th benchmark scenario: `entry-detail-by-id` with budget <=4 queries
- Update fixture route to expose `headwordEntryId` for the benchmark to use
- Update benchmark to call entry-detail endpoint using the fixture's entry id

## Key Insights

1. Current benchmark has 7 scenarios (lines 92-100). Missing `entry-detail-by-id`.
2. Current fixture creates 2 entries (`headwordEntry`, `aliasEntry`) but only exposes `headword`/`aliasHeadword` strings. Benchmark needs the `headwordEntry.id` to call the entry-detail endpoint.
3. The `PerformanceScenarioReport` type's `phase` field currently typed as `"suggest" | "search" | "lookup"` in benchmark local types (line 35). Needs `"entry-detail"` added.
4. The `detailScenario` helper (line 251-284) is tightly coupled to query-string-based endpoints. Entry-detail uses path param -- need a new `entryDetailScenario` helper.
5. Query budget for entry-detail: `<=4` queries (spec line 518).

## Requirements

### Functional
- Add `entry-detail-by-id` scenario to `QUERY_BUDGETS` with `{ maxQueries: 4, gate: "hard" }`
- Add latency budget for `entry-detail-by-id` (follow existing pattern: median 1000ms, p95 2000ms, soft gate)
- Fixture response includes `headwordEntryId` field
- New benchmark scenario calls `GET /api/dictionary/entries/:entryId?sourceLanguage=en&targetLanguage=vi`
- Asserts response is a `DictionaryEntry` with matching `headword`
- Asserts performance phase is `"entry-detail"`

### Non-functional
- Scenario runs within existing sample loop (no extra fixture creation)
- Entry detail is measured after warm-up suggest (existing warm-up remains)

## Architecture

### Fixture Changes

`dictionary-performance-fixtures/route.ts` POST handler:
- Add `headwordEntryId: headwordEntry.id` to response data

### Benchmark Changes

`dictionary-flow-benchmark.ts`:
1. Add `FixturePayload.data.headwordEntryId: string` to type
2. Add `entry-detail-by-id` to `QUERY_BUDGETS` and `LATENCY_BUDGETS`
3. Add `entryDetailScenario` helper function
4. Call `entryDetailScenario` in `runScenarios` using `fixture.headwordEntryId`

### Data Flow

```
createFixture() -> { headword, headwordEntryId, ... }
  -> ... existing scenarios ...
  -> entryDetailScenario(context, {
       scenario: "entry-detail-by-id",
       entryId: fixture.headwordEntryId,
       expectedHeadword: fixture.headword,
     })
     -> GET /api/dictionary/entries/:entryId?sourceLanguage=en&targetLanguage=vi
     -> assert DictionaryEntry with correct headword
     -> assert phase === "entry-detail"
     -> build report
```

## Related Code Files

### Modify
- `src/app/api/test/dictionary-performance-fixtures/route.ts` -- add `headwordEntryId` to response
- `tests/performance/dictionary-flow-benchmark.ts` -- add scenario, helper, budgets, fixture type

### Create
- None

### Delete
- None

## Implementation Steps

1. Open `src/app/api/test/dictionary-performance-fixtures/route.ts`
   - Add `headwordEntryId: headwordEntry.id` to the response data object (after line 65)

2. Open `tests/performance/dictionary-flow-benchmark.ts`

3. Add to `FixturePayload` type (around line 78):
   ```ts
   headwordEntryId: string;
   ```

4. Add to `QUERY_BUDGETS` (after line 99):
   ```ts
   "entry-detail-by-id": { maxQueries: 4, gate: "hard" },
   ```

5. Add to `LATENCY_BUDGETS` (after line 109):
   ```ts
   "entry-detail-by-id": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
   ```

6. Add `entryDetailScenario` helper function (after `detailScenario`):
   ```ts
   async function entryDetailScenario(
     context: BenchmarkContext,
     input: {
       scenario: string;
       entryId: string;
       expectedHeadword: string;
     },
   ): Promise<PerformanceScenarioReport> {
     const startedAt = performance.now();
     const response = await getJson(
       `${context.baseUrl}/api/dictionary/entries/${encodeURIComponent(input.entryId)}?sourceLanguage=en&targetLanguage=vi`,
       context.cookie,
       performanceHeader,
     );
     const roundTripMs = roundMetric(performance.now() - startedAt);
     const payload = await parseJson<DictionaryPerformancePayload<DictionaryEntry>>(response);

     assertResponse(response, payload, input.scenario);
     assertEqual(payload.performance.phase, "entry-detail", `${input.scenario} phase`);
     assertDictionaryPerformance(payload, input.scenario);
     assertEqual(payload.data.headword, input.expectedHeadword, `${input.scenario} headword`);

     return buildReport(input.scenario, roundTripMs, payload.performance);
   }
   ```

7. Add scenario call in `runScenarios` (after line 195, before `return reports;`):
   ```ts
   reports.push(await entryDetailScenario(context, {
     scenario: "entry-detail-by-id",
     entryId: fixture.headwordEntryId,
     expectedHeadword: fixture.headword,
   }));
   ```

8. Update `DictionaryPerformancePayload` type's `phase` field (line 35) to include `"entry-detail"`:
   ```ts
   phase: "suggest" | "search" | "lookup" | "entry-detail";
   ```

## Todo List

- [ ] Add `headwordEntryId` to fixture response
- [ ] Update `FixturePayload` type in benchmark
- [ ] Add `entry-detail-by-id` to query and latency budgets
- [ ] Add `entryDetailScenario` helper function
- [ ] Add scenario call in `runScenarios`
- [ ] Update performance phase union type in benchmark
- [ ] Run benchmark to verify 8 scenarios pass

## Success Criteria

- Benchmark runs 8 scenarios (7 existing + `entry-detail-by-id`)
- `entry-detail-by-id` budget: <=4 queries, hard gate
- Fixture exposes `headwordEntryId`
- All 8 scenarios report pass/fail status

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Fixture `headwordEntryId` not populated if entry creation fails | Low | Low | Fixture already asserts success via `createDictionaryEntry`; existing pattern |
| Entry detail route not yet available when benchmark runs | Low | High | P4 must complete before P5 |

## Next Steps

- P6 will add integration tests for entry-detail
