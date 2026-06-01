import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";
import getPort, { portNumbers } from "get-port";
import { getE2EAuthCookieHeader } from "../../tests/e2e/helpers/auth-state";

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

type PerformanceScenarioReport = {
  scenario: string;
  roundTripMs: number;
  performance: TranslatePerformancePayload["performance"];
  budget?: ScenarioBudget;
  passed?: boolean;
};

const reportPath = "test-results/performance/translate-flow.json";
const benchmarkHost = "127.0.0.1";
const preferredPortStart = 3010;
const preferredPortEnd = 3999;

type BudgetGate = "hard" | "soft";

interface ScenarioBudget {
  maxQueries: number;
  gate: BudgetGate;
}

const BUDGETS: Record<string, ScenarioBudget> = {
  "single-word-dictionary": { maxQueries: 4, gate: "hard" },
  "phrase-dictionary": { maxQueries: 4, gate: "soft" },
  fallback: { maxQueries: 5, gate: "soft" },
  "cache-repeat": { maxQueries: 2, gate: "soft" },
};

type ExecaMethod = typeof import("execa").execa;
type BenchmarkServer = ReturnType<ExecaMethod>;

let execaMethod: ExecaMethod | null = null;

loadEnvFile({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnvFile({ path: resolve(process.cwd(), ".env.test"), quiet: true });

async function main() {
  const externalBaseUrl = process.env.E2E_BASE_URL ?? process.env.PERFORMANCE_BASE_URL;
  const localServer = externalBaseUrl ? null : await startBenchmarkServer();
  const baseUrl = externalBaseUrl ?? localServer?.baseUrl;

  if (!baseUrl) {
    throw new Error("Unable to resolve benchmark base URL");
  }

  const cookie = await getCookieHeader();
  let fixture: FixturePayload["data"] | null = null;

  try {
    fixture = await createFixture(baseUrl, cookie);

    console.log("Running warm-up request (discarded)...");
    await postJson(`${baseUrl}/api/translate`, cookie, {
      text: fixture.singleWord,
      context: fixture.context,
      sourceId: fixture.passageId,
      sourceLanguage: "en",
      targetLanguage: "vi",
      mode: "quick",
    });

    const reports = await runScenarios(baseUrl, cookie, fixture);

    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(
      reportPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`,
    );

    console.log(`Wrote translate performance report to ${reportPath}`);

    const budgetFailures = validateBudgets(reports);
    if (budgetFailures.length > 0) {
      console.error(`\nBudget failures:`);
      for (const f of budgetFailures) {
        console.error(`  [${f.gate.toUpperCase()}] ${f.scenario}: ${f.actual} queries (budget: ≤${f.max})`);
      }
      const hasHardFail = budgetFailures.some((f) => f.gate === "hard");
      if (hasHardFail) {
        console.error("\nHard budget failure — exiting with code 1");
        process.exit(1);
      }
    }

    console.log("\nAll budget checks passed.");
  } finally {
    if (fixture) {
      await cleanupFixture(baseUrl, cookie, fixture.cleanup).catch((error: unknown) => {
        console.warn(`Fixture cleanup failed: ${formatError(error)}`);
      });
    }
    if (localServer) {
      await stopBenchmarkServer(localServer.server);
    }
  }
}

async function runScenarios(
  baseUrl: string,
  cookie: string,
  fixture: FixturePayload["data"],
) {
  const reports: PerformanceScenarioReport[] = [];

  reports.push(await translateScenario(baseUrl, cookie, {
    scenario: "single-word-dictionary",
    sourceId: fixture.passageId,
    text: fixture.singleWord,
    context: fixture.context,
    expectedResolutionSource: "dictionary",
    expectedSelectedWords: 1,
  }));
  reports.push(await translateScenario(baseUrl, cookie, {
    scenario: "phrase-dictionary",
    sourceId: fixture.passageId,
    text: fixture.phrase,
    context: fixture.context,
    expectedResolutionSource: "phrase",
    expectedSelectedWords: 3,
  }));
  reports.push(await translateScenario(baseUrl, cookie, {
    scenario: "fallback",
    sourceId: fixture.passageId,
    text: fixture.fallbackText,
    context: fixture.context,
    expectedResolutionSource: "fallback",
    expectedSelectedWords: 1,
  }));
  reports.push(await translateScenario(baseUrl, cookie, {
    scenario: "cache-repeat",
    sourceId: fixture.passageId,
    text: fixture.phrase,
    context: fixture.context,
    expectedResolutionSource: "cache",
    expectedSelectedWords: 3,
  }));

  return reports;
}

async function createFixture(baseUrl: string, cookie: string) {
  const response = await postJson(`${baseUrl}/api/test/translate-performance-fixtures`, cookie, {});
  const payload = await parseJson<FixturePayload>(response);

  assertResponse(response, payload, "create translate performance fixture");
  return payload.data;
}

async function cleanupFixture(
  baseUrl: string,
  cookie: string,
  cleanup: FixturePayload["data"]["cleanup"],
) {
  const response = await fetch(`${baseUrl}/api/test/translate-performance-fixtures`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify(cleanup),
  });

  if (!response.ok) {
    throw new Error(`cleanup returned ${response.status}: ${await response.text()}`);
  }
}

async function translateScenario(
  baseUrl: string,
  cookie: string,
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
  const response = await postJson(`${baseUrl}/api/translate`, cookie, {
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
  const passed = budget ? actualQueries <= budget.maxQueries : true;

  return {
    scenario: input.scenario,
    roundTripMs,
    performance: payload.performance,
    budget: budget ?? undefined,
    passed,
  };
}

function validateBudgets(reports: PerformanceScenarioReport[]) {
  const failures: Array<{ scenario: string; gate: BudgetGate; actual: number; max: number }> = [];

  for (const report of reports) {
    if (!report.budget || report.passed) continue;
    failures.push({
      scenario: report.scenario,
      gate: report.budget.gate,
      actual: report.performance.prisma.queryCount,
      max: report.budget.maxQueries,
    });
  }

  return failures;
}

async function postJson(
  url: string,
  cookie: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function assertResponse(response: Response, payload: { success?: unknown }, label: string) {
  if (!response.ok || payload.success !== true) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertNumber(value: unknown, label: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label}: expected number, received ${String(value)}`);
  }
}

function assertObject(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected object, received ${String(value)}`);
  }
}

async function getCookieHeader() {
  return getE2EAuthCookieHeader({
    envCookieNames: ["E2E_AUTH_COOKIE", "BENCHMARK_COOKIE"],
  });
}

async function startBenchmarkServer() {
  const port = await getPort({
    host: benchmarkHost,
    port: portNumbers(preferredPortStart, preferredPortEnd),
    reserve: true,
  });
  const baseUrl = `http://${benchmarkHost}:${port}`;
  const execa = await getExeca();
  const server = execa(getNextCliPath(), ["dev", "--turbopack", "-H", benchmarkHost, "-p", String(port)], {
    env: {
      ...process.env,
      PRISMA_QUERY_METRICS: "1",
      TRANSLATE_PERFORMANCE_FIXTURES: "1",
    },
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    reject: false,
  });
  const serverExit = server.then((result) => {
    throw new Error(`dev server exited early with code ${result.exitCode}`);
  });
  serverExit.catch(() => undefined);

  console.log(`Starting benchmark server pid=${server.pid ?? "unknown"} url=${baseUrl}`);

  try {
    await Promise.race([
      waitForServer(port),
      serverExit,
    ]);
    await delay(1_000);
    if (server.exitCode !== null) {
      throw new Error(`dev server exited early with code ${server.exitCode}`);
    }
  } catch (error) {
    await stopBenchmarkServer(server);
    throw error;
  }

  return { baseUrl, server };
}

async function stopBenchmarkServer(server: BenchmarkServer) {
  if (server.exitCode !== null) return;

  const pid = server.pid ?? "unknown";
  console.log(`Stopping benchmark server pid=${pid}`);
  server.kill("SIGTERM");

  const stopped = await Promise.race([
    server.then(() => true),
    delay(5_000).then(() => false),
  ]);

  if (!stopped && server.exitCode === null) {
    console.warn(`Benchmark server pid=${pid} did not stop after SIGTERM; sending SIGKILL`);
    server.kill("SIGKILL");
    await server;
  }
}

function getNextCliPath() {
  return resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next",
  );
}

function getWaitOnCliPath() {
  return resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "wait-on.cmd" : "wait-on",
  );
}

async function waitForServer(port: number) {
  const execa = await getExeca();
  await execa(
    getWaitOnCliPath(),
    [
      "--timeout",
      "120000",
      "--interval",
      "500",
      `http-get://${benchmarkHost}:${port}/en/sign-in`,
    ],
    { stdio: "inherit" },
  );
}

async function getExeca() {
  if (execaMethod) return execaMethod;

  const loadExeca = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<typeof import("execa")>;
  execaMethod = (await loadExeca("execa")).execa;
  return execaMethod;
}

function countWords(value: string) {
  return value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function delay(ms: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});
