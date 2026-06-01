import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";
import { getE2EAuthCookieHeader } from "../e2e/helpers/auth-state";

export type BudgetGate = "hard" | "soft";

export interface ScenarioBudget {
  maxQueries: number;
  gate: BudgetGate;
}

export interface BenchmarkScenarioReport {
  scenario: string;
  roundTripMs: number;
  performance: {
    prisma: {
      queryCount: number;
    };
  };
  budget?: ScenarioBudget;
  passed?: boolean;
}

export interface BenchmarkContext {
  baseUrl: string;
  cookie: string;
}

const defaultBenchmarkBaseUrl = "http://localhost:3000";

loadEnvFile({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnvFile({ path: resolve(process.cwd(), ".env.test"), quiet: true });

export async function withBenchmarkContext(callback: (context: BenchmarkContext) => Promise<void>) {
  const baseUrl = normalizeBaseUrl(
    process.env.PERFORMANCE_BASE_URL ?? process.env.E2E_BASE_URL ?? defaultBenchmarkBaseUrl,
  );

  console.log(`Using performance base URL: ${baseUrl}`);
  await assertBenchmarkServerReady(baseUrl);
  const cookie = await getCookieHeader();
  await callback({ baseUrl, cookie });
}

export async function writePerformanceReport(path: string, reports: unknown[]) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`,
  );
}

export function validateBudgets<T extends BenchmarkScenarioReport>(reports: T[]) {
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

export function reportBudgetFailures(label: string, failures: ReturnType<typeof validateBudgets>) {
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

async function assertBenchmarkServerReady(baseUrl: string) {
  const healthUrl = `${baseUrl}/en/sign-in`;

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`health check returned ${response.status}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Performance benchmark requires a running dev server at ${baseUrl}. ` +
      `Start it first with: PRISMA_QUERY_METRICS=1 TRANSLATE_PERFORMANCE_FIXTURES=1 DICTIONARY_PERFORMANCE_FIXTURES=1 pnpm dev. ` +
      `Health check failed: ${reason}`,
    );
  }
}
