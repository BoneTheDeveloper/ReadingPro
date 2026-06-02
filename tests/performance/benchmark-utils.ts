import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";
import getPort from "get-port";
import { getE2EAuthCookieHeader } from "../e2e/helpers/auth-state";

export type BudgetGate = "hard" | "soft";

export interface ScenarioBudget {
  maxQueries: number;
  gate: BudgetGate;
}

export interface LatencyBudget {
  medianRoundTripMs?: number;
  p95RoundTripMs?: number;
  gate: BudgetGate;
}

export interface BenchmarkRunOptions {
  samples: number;
}

export interface RoundTripStats {
  samples: number[];
  min: number;
  median: number;
  p95: number;
  max: number;
}

export interface BenchmarkScenarioSample {
  roundTripMs: number;
  performance: unknown;
  passed?: boolean;
  queryPassed?: boolean;
}

export interface BenchmarkScenarioReport {
  scenario: string;
  roundTripMs: number;
  roundTripStats?: RoundTripStats;
  samples?: number;
  sampleReports?: BenchmarkScenarioSample[];
  performance: {
    prisma: {
      queryCount: number;
    };
  };
  queryBudget?: ScenarioBudget;
  queryPassed?: boolean;
  budget?: ScenarioBudget;
  latencyBudget?: LatencyBudget;
  latencyPassed?: boolean;
  latencyFailures?: LatencyBudgetFailure[];
  passed?: boolean;
}

export interface QueryBudgetFailure {
  scenario: string;
  gate: BudgetGate;
  actual: number;
  max: number;
}

export interface LatencyBudgetFailure {
  scenario: string;
  metric: "medianRoundTripMs" | "p95RoundTripMs";
  gate: BudgetGate;
  actual: number;
  max: number;
}

export interface BenchmarkContext {
  baseUrl: string;
  cookie: string;
}

export interface BenchmarkContextOptions {
  baseUrl?: string;
  reuseServer?: boolean;
}

interface BenchmarkServerReadinessOptions {
  reuseServer?: boolean;
  isOwnedServerRunning?: () => boolean;
}

interface OwnedBenchmarkServer {
  baseUrl: string;
  isRunning: () => boolean;
  stop: () => Promise<void>;
  output: string[];
}

const defaultBenchmarkBaseUrl = "http://localhost:3000";
const ownedServerDistDir = ".next-performance";

loadEnvFile({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnvFile({ path: resolve(process.cwd(), ".env.test"), quiet: true });

export async function withBenchmarkContext(
  options: BenchmarkContextOptions,
  callback: (context: BenchmarkContext) => Promise<void>,
) {
  const server = options.reuseServer ? null : await startOwnedBenchmarkServer();
  const removeSignalCleanup = installOwnedServerSignalCleanup(server);
  const baseUrl = normalizeBaseUrl(
    server?.baseUrl
      ?? options.baseUrl
      ?? process.env.PERFORMANCE_BASE_URL
      ?? process.env.E2E_BASE_URL
      ?? defaultBenchmarkBaseUrl,
  );

  try {
    console.log(`Using performance base URL: ${baseUrl}`);
    console.log(`Waiting for performance server readiness at ${baseUrl}...`);
    await assertBenchmarkServerReady(baseUrl, {
      reuseServer: options.reuseServer,
      isOwnedServerRunning: server?.isRunning,
    });
    console.log("Performance server is ready.");
    console.log("Resolving benchmark auth cookie...");
    const cookie = await getCookieHeader();
    console.log("Benchmark auth cookie ready.");
    await callback({ baseUrl, cookie });
  } catch (error) {
    if (server?.output.length) {
      console.error("\nOwned performance server output:");
      console.error(server.output.join("").trim());
    }
    throw error;
  } finally {
    removeSignalCleanup();
    await server?.stop();
  }
}

export async function writePerformanceReport(path: string, reports: unknown[]) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`,
  );
}

export function validateBudgets<T extends BenchmarkScenarioReport>(reports: T[]) {
  const failures: QueryBudgetFailure[] = [];

  for (const report of reports) {
    const budget = report.queryBudget ?? report.budget;
    const passed = report.queryPassed ?? report.passed;
    if (!budget || passed) continue;
    failures.push({
      scenario: report.scenario,
      gate: budget.gate,
      actual: report.performance.prisma.queryCount,
      max: budget.maxQueries,
    });
  }

  return failures;
}

export function validateLatencyBudgets<T extends BenchmarkScenarioReport>(reports: T[]) {
  return reports.flatMap((report) => report.latencyFailures ?? []);
}

export function addScenarioSample<T extends BenchmarkScenarioReport>(
  groups: Map<string, T[]>,
  report: T,
) {
  const reports = groups.get(report.scenario) ?? [];
  reports.push(report);
  groups.set(report.scenario, reports);
}

export function aggregateScenarioSampleGroups<T extends BenchmarkScenarioReport>(
  groups: Map<string, T[]>,
) {
  return Array.from(groups.values(), aggregateScenarioSamples);
}

export function aggregateScenarioSamples<T extends BenchmarkScenarioReport>(
  reports: T[],
): T {
  if (reports.length === 0) {
    throw new Error("Cannot aggregate an empty benchmark scenario sample set.");
  }

  const latest = reports[reports.length - 1];
  const roundTripStats = calculateRoundTripStats(reports.map((report) => report.roundTripMs));
  const maxQueryCount = Math.max(...reports.map((report) => report.performance.prisma.queryCount));
  const queryBudget = latest.queryBudget ?? latest.budget;
  const queryPassed = queryBudget ? maxQueryCount <= queryBudget.maxQueries : latest.queryPassed ?? latest.passed;
  const latencyFailures = evaluateLatencyBudget(latest.scenario, roundTripStats, latest.latencyBudget);
  const latencyPassed = latencyFailures.length === 0;

  return {
    ...latest,
    roundTripMs: roundTripStats.median,
    roundTripStats,
    samples: reports.length,
    performance: {
      ...latest.performance,
      prisma: {
        ...latest.performance.prisma,
        queryCount: maxQueryCount,
      },
    },
    queryBudget,
    queryPassed,
    budget: queryBudget,
    passed: queryPassed,
    latencyPassed,
    latencyFailures,
    sampleReports: reports.map((report) => ({
      roundTripMs: report.roundTripMs,
      performance: report.performance,
      passed: report.passed,
      queryPassed: report.queryPassed,
    })),
  };
}

export function calculateRoundTripStats(samples: number[]): RoundTripStats {
  if (samples.length === 0) {
    throw new Error("Cannot calculate benchmark stats without samples.");
  }

  const sorted = [...samples].sort((a, b) => a - b);

  return {
    samples,
    min: sorted[0],
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

export function evaluateLatencyBudget(
  scenario: string,
  stats: RoundTripStats,
  budget?: LatencyBudget,
) {
  const failures: LatencyBudgetFailure[] = [];
  if (!budget) return failures;

  if (budget.medianRoundTripMs !== undefined && stats.median > budget.medianRoundTripMs) {
    failures.push({
      scenario,
      metric: "medianRoundTripMs",
      gate: budget.gate,
      actual: stats.median,
      max: budget.medianRoundTripMs,
    });
  }

  if (budget.p95RoundTripMs !== undefined && stats.p95 > budget.p95RoundTripMs) {
    failures.push({
      scenario,
      metric: "p95RoundTripMs",
      gate: budget.gate,
      actual: stats.p95,
      max: budget.p95RoundTripMs,
    });
  }

  return failures;
}

export function reportBudgetFailures(label: string, failures: QueryBudgetFailure[]) {
  if (failures.length === 0) {
    console.log(`\n${label}: all budget checks passed.`);
    return;
  }

  console.error(`\n${label} budget failures:`);
  for (const f of failures) {
    console.error(`  [${f.gate.toUpperCase()}] ${f.scenario}: ${f.actual} queries (budget: <=${f.max})`);
  }

  if (failures.some((f) => f.gate === "hard")) {
    throw new Error(`${label} hard budget failure`);
  }
}

export function reportLatencyBudgetFailures(label: string, failures: LatencyBudgetFailure[]) {
  if (failures.length === 0) {
    console.log(`\n${label}: all latency budget checks passed.`);
    return;
  }

  console.warn(`\n${label} latency budget warnings:`);
  for (const f of failures) {
    console.warn(`  [${f.gate.toUpperCase()}] ${f.scenario}: ${f.metric} ${f.actual}ms (budget: <=${f.max}ms)`);
  }

  if (failures.some((f) => f.gate === "hard")) {
    throw new Error(`${label} hard latency budget failure`);
  }
}

export async function postJson(
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

export async function deleteJson(
  url: string,
  cookie: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return fetch(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      cookie,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export async function getJson(
  url: string,
  cookie: string,
  headers: Record<string, string> = {},
) {
  return fetch(url, {
    method: "GET",
    headers: {
      cookie,
      ...headers,
    },
  });
}

export async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export function assertResponse(response: Response, payload: { success?: unknown }, label: string) {
  if (!response.ok || payload.success !== true) {
    const fixtureHint = (response.status === 404 || response.status === 412) && label.includes("performance fixture")
      ? " The benchmark reached the dev server, but the fixture route is disabled. Restart the dev server with PRISMA_QUERY_METRICS=1 TRANSLATE_PERFORMANCE_FIXTURES=1 DICTIONARY_PERFORMANCE_FIXTURES=1."
      : "";
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(payload)}.${fixtureHint}`);
  }
}

export function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

export function assertNumber(value: unknown, label: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label}: expected number, received ${String(value)}`);
  }
}

export function assertObject(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected object, received ${String(value)}`);
  }
}

export function countWords(value: string) {
  return value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
}

export function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function getCookieHeader() {
  return getE2EAuthCookieHeader({
    envCookieNames: ["E2E_AUTH_COOKIE", "BENCHMARK_COOKIE"],
  });
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function percentile(sortedSamples: number[], percentileValue: number) {
  const index = Math.ceil((percentileValue / 100) * sortedSamples.length) - 1;
  return sortedSamples[Math.max(0, Math.min(index, sortedSamples.length - 1))];
}

async function startOwnedBenchmarkServer() {
  const port = await getPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output: string[] = [];
  const server = spawn(
    "pnpm",
    ["exec", "next", "dev", "--turbopack", "-H", "127.0.0.1", "-p", String(port)],
    {
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        NEXT_DIST_DIR: ownedServerDistDir,
        PRISMA_QUERY_METRICS: "1",
        TRANSLATE_PERFORMANCE_FIXTURES: "1",
        DICTIONARY_PERFORMANCE_FIXTURES: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  captureServerOutput(server, output);
  console.log(`Started owned performance server on ${baseUrl} with NEXT_DIST_DIR=${ownedServerDistDir}`);

  return {
    baseUrl,
    isRunning: () => server.exitCode === null && server.signalCode === null,
    stop: async () => {
      await stopServer(server);
    },
    output,
  };
}

function installOwnedServerSignalCleanup(server: OwnedBenchmarkServer | null) {
  if (!server) {
    return () => {};
  }

  let stopping = false;

  const stopAndExit = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;

    console.log(`\nReceived ${signal}; stopping owned performance server...`);
    server.stop()
      .catch((error: unknown) => {
        console.error(`Failed to stop owned performance server: ${formatError(error)}`);
      })
      .finally(() => {
        process.exit(signal === "SIGINT" ? 130 : 143);
      });
  };

  const onSigint = () => stopAndExit("SIGINT");
  const onSigterm = () => stopAndExit("SIGTERM");

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  return () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  };
}

function captureServerOutput(server: ChildProcess, output: string[]) {
  const capture = (chunk: Buffer | string) => {
    output.push(String(chunk));
    if (output.length > 40) output.shift();
  };
  server.stdout?.on("data", capture);
  server.stderr?.on("data", capture);
}

async function stopServer(server: ChildProcess) {
  if (server.exitCode !== null || server.signalCode !== null) return;

  killServer(server, "SIGTERM");
  const stopped = await waitForServerExit(server, 5_000);
  if (!stopped) {
    killServer(server, "SIGKILL");
    await waitForServerExit(server, 2_000);
  }
}

function killServer(server: ChildProcess, signal: NodeJS.Signals) {
  if (!server.pid) return;

  try {
    if (process.platform === "win32") {
      server.kill(signal);
      return;
    }

    process.kill(-server.pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
      throw error;
    }
  }
}

function waitForServerExit(
  server: ChildProcess,
  timeoutMs: number,
) {
  return new Promise<boolean>((resolveExit) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolveExit(false);
    }, timeoutMs);

    const onExit = () => {
      cleanup();
      resolveExit(true);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      server.off("exit", onExit);
    };

    server.once("exit", onExit);
  });
}

async function assertBenchmarkServerReady(
  baseUrl: string,
  options: BenchmarkServerReadinessOptions = {},
) {
  const healthUrl = `${baseUrl}/en/sign-in`;
  const timeoutMs = options.reuseServer ? 5_000 : 120_000;
  const startedAt = Date.now();
  let nextProgressAt = startedAt + 5_000;
  let lastReason = "not checked";

  while (Date.now() - startedAt < timeoutMs) {
    if (options.isOwnedServerRunning && !options.isOwnedServerRunning()) {
      throw new Error(`Owned performance server exited before readiness. Last health check: ${lastReason}`);
    }

    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        return;
      }
      lastReason = `health check returned ${response.status}`;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }

    const now = Date.now();
    if (now >= nextProgressAt) {
      const elapsedSeconds = Math.round((now - startedAt) / 1_000);
      console.log(`Still waiting for performance server after ${elapsedSeconds}s (${lastReason})...`);
      nextProgressAt = now + 5_000;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  const reuseHint = options.reuseServer
    ? "Start it first with: PRISMA_QUERY_METRICS=1 TRANSLATE_PERFORMANCE_FIXTURES=1 DICTIONARY_PERFORMANCE_FIXTURES=1 pnpm dev."
    : `The owned server did not become ready. It uses NEXT_DIST_DIR=${ownedServerDistDir} to avoid the normal .next dev lock.`;

  throw new Error(
    `Performance benchmark requires a running dev server at ${baseUrl}. ` +
    `${reuseHint} Health check failed: ${lastReason}`,
  );
}
