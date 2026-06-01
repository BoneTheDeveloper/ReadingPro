import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";
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
};

const reportPath = "test-results/performance/translate-flow.json";
const defaultBaseUrl = "http://127.0.0.1:3010";

loadEnvFile({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnvFile({ path: resolve(process.cwd(), ".env.test"), quiet: true });

async function main() {
  const externalBaseUrl = process.env.E2E_BASE_URL ?? process.env.PERFORMANCE_BASE_URL;
  const baseUrl = externalBaseUrl ?? defaultBaseUrl;
  const cookie = await getCookieHeader();
  const server = externalBaseUrl ? null : await startBenchmarkServer(baseUrl);
  let fixture: FixturePayload["data"] | null = null;

  try {
    fixture = await createFixture(baseUrl, cookie);
    const reports = await runScenarios(baseUrl, cookie, fixture);

    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(
      reportPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`,
    );

    console.log(`Wrote translate performance report to ${reportPath}`);
  } finally {
    if (fixture) {
      await cleanupFixture(baseUrl, cookie, fixture.cleanup).catch((error: unknown) => {
        console.warn(`Fixture cleanup failed: ${formatError(error)}`);
      });
    }
    if (server) {
      await stopBenchmarkServer(server);
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

  for (const step of ["authenticate", "sourceFetch", "cacheFetch", "historyCreate"]) {
    assertNumber(payload.performance.timings.steps[step], `${input.scenario} ${step} timing`);
  }

  return {
    scenario: input.scenario,
    roundTripMs,
    performance: payload.performance,
  };
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

async function getCookieHeader() {
  return getE2EAuthCookieHeader({
    envCookieNames: ["E2E_AUTH_COOKIE", "BENCHMARK_COOKIE"],
  });
}

async function startBenchmarkServer(baseUrl: string) {
  const child = spawn(getNextCliPath(), ["dev", "--turbopack", "-p", getServerPort(baseUrl)], {
    env: {
      ...process.env,
      PRISMA_QUERY_METRICS: "1",
      TRANSLATE_PERFORMANCE_FIXTURES: "1",
    },
    stdio: "inherit",
  });

  await waitForServer(baseUrl, child);
  return child;
}

async function stopBenchmarkServer(child: ChildProcess) {
  if (child.exitCode !== null) return;

  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolveStop();
    }, 5_000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });

    child.kill("SIGTERM");
  });
}

function getNextCliPath() {
  return resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next",
  );
}

function getServerPort(baseUrl: string) {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

async function waitForServer(baseUrl: string, child: ChildProcess) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`dev server exited early with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.status < 500) return;
    } catch {
      await delay(500);
    }
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
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
