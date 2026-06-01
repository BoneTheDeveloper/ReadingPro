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
    phase: "suggest" | "search" | "lookup";
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
  "suggest-headword-prefix": { maxQueries: 12, gate: "hard" },
  "suggest-alias-prefix": { maxQueries: 12, gate: "hard" },
  "search-exact-headword": { maxQueries: 6, gate: "hard" },
  "lookup-exact-headword": { maxQueries: 6, gate: "hard" },
  "lookup-exact-alias": { maxQueries: 8, gate: "hard" },
  "lookup-miss": { maxQueries: 6, gate: "hard" },
};

const LATENCY_BUDGETS: Record<string, LatencyBudget> = {
  "suggest-short-query": { medianRoundTripMs: 150, p95RoundTripMs: 300, gate: "soft" },
  "suggest-headword-prefix": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "suggest-alias-prefix": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "search-exact-headword": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "lookup-exact-headword": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "lookup-exact-alias": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
  "lookup-miss": { medianRoundTripMs: 1_000, p95RoundTripMs: 2_000, gate: "soft" },
};

export async function runDictionaryFlowBenchmark(
  context: BenchmarkContext,
  options: BenchmarkRunOptions,
) {
  const samplesByScenario = new Map<string, PerformanceScenarioReport[]>();

  for (let sampleIndex = 0; sampleIndex < options.samples; sampleIndex += 1) {
    let fixture: FixturePayload["data"] | null = null;

    try {
      fixture = await createFixture(context);

      console.log(`Running dictionary warm-up request for sample ${sampleIndex + 1}/${options.samples} (discarded)...`);
      await getJson(`${context.baseUrl}/api/dictionary/suggest?q=${encodeURIComponent(fixture.headwordPrefix)}&sourceLanguage=en&targetLanguage=vi`, context.cookie);

      const reports = await runScenarios(context, fixture);
      for (const report of reports) {
        addScenarioSample(samplesByScenario, report);
      }
    } finally {
      if (fixture) {
        await cleanupFixture(context, fixture.cleanup).catch((error: unknown) => {
          console.warn(`Dictionary fixture cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    }
  }

  const reports = aggregateScenarioSampleGroups(samplesByScenario);
  await writePerformanceReport(reportPath, reports);
  console.log(`Wrote dictionary performance report to ${reportPath}`);
  reportBudgetFailures("dictionary-flow", validateBudgets(reports));
  reportLatencyBudgetFailures("dictionary-flow", validateLatencyBudgets(reports));
}

async function runScenarios(
  context: BenchmarkContext,
  fixture: FixturePayload["data"],
) {
  const reports: PerformanceScenarioReport[] = [];

  reports.push(await suggestScenario(context, {
    scenario: "suggest-short-query",
    query: "p",
    expectedHeadword: null,
  }));
  reports.push(await suggestScenario(context, {
    scenario: "suggest-headword-prefix",
    query: fixture.headwordPrefix,
    expectedHeadword: fixture.headword,
  }));
  reports.push(await suggestScenario(context, {
    scenario: "suggest-alias-prefix",
    query: fixture.aliasPrefix,
    expectedHeadword: fixture.aliasHeadword,
  }));
  reports.push(await detailScenario(context, {
    scenario: "search-exact-headword",
    phase: "search",
    path: "/api/dictionary/search",
    query: fixture.headword,
    expectedHeadword: fixture.headword,
  }));
  reports.push(await detailScenario(context, {
    scenario: "lookup-exact-headword",
    phase: "lookup",
    path: "/api/dictionary/lookup",
    query: fixture.headword,
    expectedHeadword: fixture.headword,
  }));
  reports.push(await detailScenario(context, {
    scenario: "lookup-exact-alias",
    phase: "lookup",
    path: "/api/dictionary/lookup",
    query: fixture.alias,
    expectedHeadword: fixture.aliasHeadword,
  }));
  reports.push(await detailScenario(context, {
    scenario: "lookup-miss",
    phase: "lookup",
    path: "/api/dictionary/lookup",
    query: fixture.miss,
    expectedHeadword: null,
  }));

  return reports;
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

async function detailScenario(
  context: BenchmarkContext,
  input: {
    scenario: string;
    phase: "search" | "lookup";
    path: "/api/dictionary/search" | "/api/dictionary/lookup";
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
