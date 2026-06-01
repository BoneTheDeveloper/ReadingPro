import {
  assertEqual,
  assertNumber,
  assertObject,
  assertResponse,
  type BenchmarkContext,
  type BenchmarkScenarioReport,
  countWords,
  deleteJson,
  parseJson,
  postJson,
  reportBudgetFailures,
  roundMetric,
  type ScenarioBudget,
  validateBudgets,
  writePerformanceReport,
} from "./benchmark-utils";

type TranslatePerformancePayload = {
  success: true;
  data: {
    translation: string;
    provider: string;
  };
  performance: {
    selectedTextWordCount: number;
    contextWordCount: number;
    wordsBeforeSelected: number | null;
    resolutionSource: string;
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

type FixturePayload = {
  success: true;
  data: {
    passageId: string;
    singleWord: string;
    phrase: string;
    fallbackText: string;
    context: string;
    cleanup: {
      passageIds: string[];
      dictionaryEntryIds: string[];
    };
  };
};

type PerformanceScenarioReport = BenchmarkScenarioReport & {
  performance: TranslatePerformancePayload["performance"];
  budget?: ScenarioBudget;
};

const reportPath = "test-results/performance/translate-flow.json";

const BUDGETS: Record<string, ScenarioBudget> = {
  "single-word-dictionary": { maxQueries: 4, gate: "hard" },
  "phrase-dictionary": { maxQueries: 4, gate: "soft" },
  fallback: { maxQueries: 5, gate: "soft" },
  "cache-repeat": { maxQueries: 2, gate: "soft" },
};

export async function runTranslateFlowBenchmark(context: BenchmarkContext) {
  let fixture: FixturePayload["data"] | null = null;

  try {
    fixture = await createFixture(context);

    console.log("Running translate warm-up request (discarded)...");
    await postJson(`${context.baseUrl}/api/translate`, context.cookie, {
      text: fixture.singleWord,
      context: fixture.context,
      sourceId: fixture.passageId,
      sourceLanguage: "en",
      targetLanguage: "vi",
      mode: "quick",
    });

    const reports = await runScenarios(context, fixture);
    await writePerformanceReport(reportPath, reports);
    console.log(`Wrote translate performance report to ${reportPath}`);
    reportBudgetFailures("translate-flow", validateBudgets(reports));
  } finally {
    if (fixture) {
      await cleanupFixture(context, fixture.cleanup).catch((error: unknown) => {
        console.warn(`Translate fixture cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  }
}

async function runScenarios(
  context: BenchmarkContext,
  fixture: FixturePayload["data"],
) {
  const reports: PerformanceScenarioReport[] = [];

  reports.push(await translateScenario(context, {
    scenario: "single-word-dictionary",
    sourceId: fixture.passageId,
    text: fixture.singleWord,
    context: fixture.context,
    expectedResolutionSource: "dictionary",
    expectedSelectedWords: 1,
  }));
  reports.push(await translateScenario(context, {
    scenario: "phrase-dictionary",
    sourceId: fixture.passageId,
    text: fixture.phrase,
    context: fixture.context,
    expectedResolutionSource: "phrase",
    expectedSelectedWords: 3,
  }));
  reports.push(await translateScenario(context, {
    scenario: "fallback",
    sourceId: fixture.passageId,
    text: fixture.fallbackText,
    context: fixture.context,
    expectedResolutionSource: "fallback",
    expectedSelectedWords: 1,
  }));
  reports.push(await translateScenario(context, {
    scenario: "cache-repeat",
    sourceId: fixture.passageId,
    text: fixture.phrase,
    context: fixture.context,
    expectedResolutionSource: "cache",
    expectedSelectedWords: 3,
  }));

  return reports;
}

async function createFixture(context: BenchmarkContext) {
  const response = await postJson(`${context.baseUrl}/api/test/translate-performance-fixtures`, context.cookie, {});
  const payload = await parseJson<FixturePayload>(response);

  assertResponse(response, payload, "create translate performance fixture");
  return payload.data;
}

async function cleanupFixture(
  context: BenchmarkContext,
  cleanup: FixturePayload["data"]["cleanup"],
) {
  const response = await deleteJson(`${context.baseUrl}/api/test/translate-performance-fixtures`, context.cookie, cleanup);

  if (!response.ok) {
    throw new Error(`cleanup returned ${response.status}: ${await response.text()}`);
  }
}

async function translateScenario(
  context: BenchmarkContext,
  input: {
    scenario: string;
    sourceId: string;
    text: string;
    context: string;
    expectedResolutionSource: string;
    expectedSelectedWords: number;
  },
): Promise<PerformanceScenarioReport> {
  const startedAt = performance.now();
  const response = await postJson(`${context.baseUrl}/api/translate`, context.cookie, {
    text: input.text,
    context: input.context,
    sourceId: input.sourceId,
    sourceLanguage: "en",
    targetLanguage: "vi",
    mode: "quick",
    clientMetrics: {
      wordsBeforeSelected: countWords(input.context.slice(0, input.context.indexOf(input.text))),
    },
  }, { "x-translate-perf-metrics": "1" });
  const roundTripMs = roundMetric(performance.now() - startedAt);
  const payload = await parseJson<TranslatePerformancePayload>(response);

  assertResponse(response, payload, input.scenario);
  assertEqual(payload.performance.selectedTextWordCount, input.expectedSelectedWords, `${input.scenario} selected word count`);
  assertEqual(payload.performance.contextWordCount, countWords(input.context), `${input.scenario} context word count`);
  assertEqual(payload.performance.resolutionSource, input.expectedResolutionSource, `${input.scenario} resolution source`);
  assertNumber(payload.performance.wordsBeforeSelected, `${input.scenario} words before selected`);
  assertNumber(payload.performance.timings.totalMs, `${input.scenario} total route ms`);
  assertNumber(payload.performance.prisma.queryCount, `${input.scenario} Prisma query count`);
  assertNumber(payload.performance.prisma.totalDurationMs, `${input.scenario} Prisma duration`);
  assertObject(payload.performance.prisma.steps, `${input.scenario} Prisma steps`);

  for (const step of ["auth", "sourceFetch", "cacheRead", "historyCreate"]) {
    assertNumber(payload.performance.timings.steps[step], `${input.scenario} ${step} timing`);
  }

  for (const [step, metrics] of Object.entries(payload.performance.prisma.steps)) {
    assertNumber(metrics.queries, `${input.scenario} ${step} Prisma query count`);
    assertNumber(metrics.ms, `${input.scenario} ${step} Prisma duration`);
  }

  const budget = BUDGETS[input.scenario];
  const actualQueries = payload.performance.prisma.queryCount;

  return {
    scenario: input.scenario,
    roundTripMs,
    performance: payload.performance,
    budget: budget ?? undefined,
    passed: budget ? actualQueries <= budget.maxQueries : true,
  };
}
