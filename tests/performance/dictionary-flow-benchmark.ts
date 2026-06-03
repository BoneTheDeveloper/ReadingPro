import {
  assertEqual,
  assertNumber,
  assertObject,
  assertResponse,
  addScenarioSample,
  aggregateScenarioSampleGroups,
  type BenchmarkContext,
  type BenchmarkRunOptions,
  type BenchmarkScenarioReport,
  deleteJson,
  getJson,
  type LatencyBudget,
  parseJson,
  postJson,
  reportBudgetFailures,
  reportLatencyBudgetFailures,
  roundMetric,
  type ScenarioBudget,
  validateBudgets,
  validateLatencyBudgets,
  writePerformanceReport,
} from "./benchmark-utils";

type DictionaryPerformancePayload<TData> = {
  success: true;
  data: TData;
  performance: {
    queryLength: number;
    normalizedQueryLength: number;
    phase: "suggest" | "search" | "lookup" | "entry-detail";
    timings: {
      totalMs: number;
      steps: Record<string, number>;
    };
    prisma: {
      queryCount: number;
      totalDurationMs: number;
      steps: Record<string, {
        queries: number;
        ms: number;
      }>;
    };
  };
};

type SuggestItem = {
  id: string;
  headword: string;
  matchType: string;
  matchedAlias: string | null;
  primaryTranslation: string | null;
  sourceLabel: string | null;
};

type DictionaryEntry = {
  id: string;
  headword: string;
  sourceLanguage: string;
  senses: unknown[];
};

type DictionaryMiss = {
  headword: string;
  found: false;
};

type FixturePayload = {
  success: true;
  data: {
    headword: string;
    headwordEntryId: string;
    headwordPrefix: string;
    aliasHeadword: string;
    alias: string;
    aliasPrefix: string;
    miss: string;
    cleanup: {
      dictionaryEntryIds: string[];
    };
  };
};

type PerformanceScenarioReport = BenchmarkScenarioReport & {
  performance: DictionaryPerformancePayload<unknown>["performance"];
  queryBudget?: ScenarioBudget;
  latencyBudget?: LatencyBudget;
};

const reportPath = "test-results/performance/dictionary-flow.json";
const performanceHeader = { "x-dictionary-perf-metrics": "1" };

const QUERY_BUDGETS: Record<string, ScenarioBudget> = {
  "suggest-short-query": { maxQueries: 0, gate: "hard" },
  "suggest-headword-prefix": { maxQueries: 1, gate: "hard" },
  "suggest-alias-prefix": { maxQueries: 1, gate: "hard" },
  "search-exact-headword": { maxQueries: 6, gate: "hard" },
  "lookup-exact-headword": { maxQueries: 1, gate: "hard" },
  "lookup-exact-alias": { maxQueries: 1, gate: "hard" },
  "lookup-miss": { maxQueries: 1, gate: "hard" },
  "entry-detail-by-id": { maxQueries: 1, gate: "hard" },
};

const LATENCY_BUDGETS: Record<string, LatencyBudget> = {
  "suggest-short-query": { medianRoundTripMs: 150, p95RoundTripMs: 300, gate: "soft" },
  "suggest-headword-prefix": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "suggest-alias-prefix": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "search-exact-headword": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "lookup-exact-headword": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "lookup-exact-alias": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "lookup-miss": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "entry-detail-by-id": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
};

export async function runDictionaryFlowBenchmark(
  context: BenchmarkContext,
  options: BenchmarkRunOptions,
) {
  const samplesByScenario = new Map<string, PerformanceScenarioReport[]>();

  console.log(`Running dictionary performance suite with ${options.samples} sample(s) per scenario...`);

  await warmUpDictionaryFlow(context);

  for (let sampleIndex = 0; sampleIndex < options.samples; sampleIndex += 1) {
    let fixture: FixturePayload["data"] | null = null;
    const sampleLabel = `sample ${sampleIndex + 1}/${options.samples}`;

    try {
      console.log(`Dictionary ${sampleLabel}: creating fixture...`);
      fixture = await createFixture(context);
      console.log(`Dictionary ${sampleLabel}: fixture ready (${fixture.headword}, alias ${fixture.alias})`);

      console.log(`Dictionary ${sampleLabel}: priming caches...`);
      await getJson(`${context.baseUrl}/api/dictionary/suggest?q=${encodeURIComponent(fixture.headwordPrefix)}&sourceLanguage=en&targetLanguage=vi`, context.cookie);

      const reports = await runScenarios(context, fixture, sampleLabel);
      for (const report of reports) {
        addScenarioSample(samplesByScenario, report);
      }
    } finally {
      if (fixture) {
        console.log(`Dictionary ${sampleLabel}: cleaning fixture...`);
        await cleanupFixture(context, fixture.cleanup).catch((error: unknown) => {
          console.warn(`Dictionary fixture cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        });
        console.log(`Dictionary ${sampleLabel}: cleanup complete`);
      }
    }
  }

  const reports = aggregateScenarioSampleGroups(samplesByScenario);
  const reportArtifacts = await writePerformanceReport(reportPath, reports);
  console.log(`Wrote dictionary performance report to ${reportArtifacts.jsonPath}`);
  console.log(`Wrote dictionary Markdown report to ${reportArtifacts.markdownPath}`);
  reportBudgetFailures("dictionary-flow", validateBudgets(reports));
  reportLatencyBudgetFailures("dictionary-flow", validateLatencyBudgets(reports));
}

async function warmUpDictionaryFlow(context: BenchmarkContext) {
  console.log("Warming up dictionary flow (suggest, search, lookup, entry-detail)...");
  let warmupFixture: FixturePayload["data"] | null = null;

  try {
    warmupFixture = await createFixture(context);
    const params = "sourceLanguage=en&targetLanguage=vi";

    await getJson(`${context.baseUrl}/api/dictionary/suggest?q=${encodeURIComponent(warmupFixture.headwordPrefix)}&${params}`, context.cookie);
    await getJson(`${context.baseUrl}/api/dictionary/search?q=${encodeURIComponent(warmupFixture.headword)}&${params}`, context.cookie);
    await getJson(`${context.baseUrl}/api/dictionary/lookup?q=${encodeURIComponent(warmupFixture.headword)}&${params}`, context.cookie);
    await getJson(`${context.baseUrl}/api/dictionary/entries/${encodeURIComponent(warmupFixture.headwordEntryId)}?${params}`, context.cookie);

    console.log("Dictionary flow warm-up complete.");
  } finally {
    if (warmupFixture) {
      await cleanupFixture(context, warmupFixture.cleanup).catch((error: unknown) => {
        console.warn(`Dictionary warm-up cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  }
}

async function runScenarios(
  context: BenchmarkContext,
  fixture: FixturePayload["data"],
  sampleLabel: string,
) {
  const reports: PerformanceScenarioReport[] = [];

  reports.push(await runDictionaryScenario(sampleLabel, "suggest-short-query", () =>
    suggestScenario(context, {
      scenario: "suggest-short-query",
      query: "p",
      expectedHeadword: null,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "suggest-headword-prefix", () =>
    suggestScenario(context, {
      scenario: "suggest-headword-prefix",
      query: fixture.headwordPrefix,
      expectedHeadword: fixture.headword,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "suggest-alias-prefix", () =>
    suggestScenario(context, {
      scenario: "suggest-alias-prefix",
      query: fixture.aliasPrefix,
      expectedHeadword: fixture.aliasHeadword,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "search-exact-headword", () =>
    searchScenario(context, {
      scenario: "search-exact-headword",
      query: fixture.headword,
      expectedHeadword: fixture.headword,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "lookup-exact-headword", () =>
    detailScenario(context, {
      scenario: "lookup-exact-headword",
      phase: "lookup",
      path: "/api/dictionary/lookup",
      query: fixture.headword,
      expectedHeadword: fixture.headword,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "lookup-exact-alias", () =>
    detailScenario(context, {
      scenario: "lookup-exact-alias",
      phase: "lookup",
      path: "/api/dictionary/lookup",
      query: fixture.alias,
      expectedHeadword: fixture.aliasHeadword,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "lookup-miss", () =>
    detailScenario(context, {
      scenario: "lookup-miss",
      phase: "lookup",
      path: "/api/dictionary/lookup",
      query: fixture.miss,
      expectedHeadword: null,
    }),
  ));
  reports.push(await runDictionaryScenario(sampleLabel, "entry-detail-by-id", () =>
    entryDetailScenario(context, {
      scenario: "entry-detail-by-id",
      entryId: fixture.headwordEntryId,
      expectedHeadword: fixture.headword,
    }),
  ));

  return reports;
}

async function runDictionaryScenario(
  sampleLabel: string,
  scenario: string,
  callback: () => Promise<PerformanceScenarioReport>,
) {
  console.log(`Dictionary ${sampleLabel}: ${scenario} started...`);
  const report = await callback();
  console.log(
    `Dictionary ${sampleLabel}: ${scenario} passed (${report.roundTripMs}ms, ${report.performance.prisma.queryCount} Prisma queries)`,
  );
  return report;
}

async function createFixture(context: BenchmarkContext) {
  const response = await postJson(`${context.baseUrl}/api/test/dictionary-performance-fixtures`, context.cookie, {});
  const payload = await parseJson<FixturePayload>(response);

  assertResponse(response, payload, "create dictionary performance fixture");
  return payload.data;
}

async function cleanupFixture(
  context: BenchmarkContext,
  cleanup: FixturePayload["data"]["cleanup"],
) {
  const response = await deleteJson(`${context.baseUrl}/api/test/dictionary-performance-fixtures`, context.cookie, cleanup);

  if (!response.ok) {
    throw new Error(`cleanup returned ${response.status}: ${await response.text()}`);
  }
}

async function suggestScenario(
  context: BenchmarkContext,
  input: {
    scenario: string;
    query: string;
    expectedHeadword: string | null;
  },
): Promise<PerformanceScenarioReport> {
  const startedAt = performance.now();
  const response = await getJson(
    `${context.baseUrl}/api/dictionary/suggest?q=${encodeURIComponent(input.query)}&sourceLanguage=en&targetLanguage=vi`,
    context.cookie,
    performanceHeader,
  );
  const roundTripMs = roundMetric(performance.now() - startedAt);
  const payload = await parseJson<DictionaryPerformancePayload<SuggestItem[]>>(response);

  assertResponse(response, payload, input.scenario);
  assertEqual(payload.performance.phase, "suggest", `${input.scenario} phase`);
  assertDictionaryPerformance(payload, input.scenario);

  if (input.expectedHeadword) {
    if (!payload.data.some((item) => item.headword === input.expectedHeadword)) {
      throw new Error(`${input.scenario}: expected suggestion for ${input.expectedHeadword}`);
    }
  } else {
    assertEqual(payload.data.length, 0, `${input.scenario} result count`);
  }

  return buildReport(input.scenario, roundTripMs, payload.performance);
}

type SearchResult = {
  id: string;
  headword: string;
  matchType: string;
  matchedText: string | null;
  primaryTranslation: string | null;
  partOfSpeech: string | null;
  sourceLabel: string | null;
};

async function searchScenario(
  context: BenchmarkContext,
  input: {
    scenario: string;
    query: string;
    expectedHeadword: string | null;
  },
): Promise<PerformanceScenarioReport> {
  const startedAt = performance.now();
  const response = await getJson(
    `${context.baseUrl}/api/dictionary/search?q=${encodeURIComponent(input.query)}&sourceLanguage=en&targetLanguage=vi`,
    context.cookie,
    performanceHeader,
  );
  const roundTripMs = roundMetric(performance.now() - startedAt);
  const payload = await parseJson<DictionaryPerformancePayload<SearchResult[]>>(response);

  assertResponse(response, payload, input.scenario);
  assertEqual(payload.performance.phase, "search", `${input.scenario} phase`);
  assertDictionaryPerformance(payload, input.scenario);

  if (input.expectedHeadword) {
    if (!payload.data.some((item) => item.headword === input.expectedHeadword)) {
      throw new Error(`${input.scenario}: expected search result for ${input.expectedHeadword}`);
    }
  } else {
    assertEqual(payload.data.length, 0, `${input.scenario} result count`);
  }

  return buildReport(input.scenario, roundTripMs, payload.performance);
}

async function detailScenario(
  context: BenchmarkContext,
  input: {
    scenario: string;
    phase: "lookup";
    path: "/api/dictionary/lookup";
    query: string;
    expectedHeadword: string | null;
  },
): Promise<PerformanceScenarioReport> {
  const startedAt = performance.now();
  const response = await getJson(
    `${context.baseUrl}${input.path}?q=${encodeURIComponent(input.query)}&sourceLanguage=en&targetLanguage=vi`,
    context.cookie,
    performanceHeader,
  );
  const roundTripMs = roundMetric(performance.now() - startedAt);
  const payload = await parseJson<DictionaryPerformancePayload<DictionaryEntry | DictionaryMiss>>(response);

  assertResponse(response, payload, input.scenario);
  assertEqual(payload.performance.phase, input.phase, `${input.scenario} phase`);
  assertDictionaryPerformance(payload, input.scenario);

  if (input.expectedHeadword) {
    if ("found" in payload.data) {
      throw new Error(`${input.scenario}: expected dictionary entry, received miss`);
    }
    assertEqual(payload.data.headword, input.expectedHeadword, `${input.scenario} headword`);
  } else {
    assertEqual("found" in payload.data ? payload.data.found : true, false, `${input.scenario} miss`);
  }

  return buildReport(input.scenario, roundTripMs, payload.performance);
}

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

function assertDictionaryPerformance(
  payload: DictionaryPerformancePayload<unknown>,
  scenario: string,
) {
  assertNumber(payload.performance.queryLength, `${scenario} query length`);
  assertNumber(payload.performance.normalizedQueryLength, `${scenario} normalized query length`);
  assertNumber(payload.performance.timings.totalMs, `${scenario} total route ms`);
  assertObject(payload.performance.timings.steps, `${scenario} timing steps`);
  assertNumber(payload.performance.prisma.queryCount, `${scenario} Prisma query count`);
  assertNumber(payload.performance.prisma.totalDurationMs, `${scenario} Prisma duration`);
  assertObject(payload.performance.prisma.steps, `${scenario} Prisma steps`);

  for (const [step, metrics] of Object.entries(payload.performance.prisma.steps)) {
    assertNumber(metrics.queries, `${scenario} ${step} Prisma query count`);
    assertNumber(metrics.ms, `${scenario} ${step} Prisma duration`);
  }
}

function buildReport(
  scenario: string,
  roundTripMs: number,
  performance: DictionaryPerformancePayload<unknown>["performance"],
): PerformanceScenarioReport {
  const queryBudget = QUERY_BUDGETS[scenario];
  const latencyBudget = LATENCY_BUDGETS[scenario];
  const actualQueries = performance.prisma.queryCount;
  const queryPassed = queryBudget ? actualQueries <= queryBudget.maxQueries : true;

  return {
    scenario,
    roundTripMs,
    performance,
    queryBudget: queryBudget ?? undefined,
    budget: queryBudget ?? undefined,
    queryPassed,
    passed: queryPassed,
    latencyBudget: latencyBudget ?? undefined,
  };
}
