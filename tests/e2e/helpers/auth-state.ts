import { readFile } from "node:fs/promises";

export const E2E_AUTH_FILE = ".auth/user.json";

const DEFAULT_COOKIE_ENV_NAMES = ["E2E_AUTH_COOKIE", "BENCHMARK_COOKIE"];

type StorageState = {
  cookies?: Array<{
    name: string;
    value: string;
  }>;
};

export async function getE2EAuthCookieHeader(options?: {
  storageStatePath?: string;
  envCookieNames?: string[];
}) {
  const envCookie = getAuthCookieFromEnv(options?.envCookieNames);
  if (envCookie) return envCookie;

  const storageStatePath = options?.storageStatePath ?? E2E_AUTH_FILE;
  const storageStateCookie = await getAuthCookieFromStorageState(storageStatePath);
  if (storageStateCookie) return storageStateCookie;

  throw new Error(
    `Missing Clerk auth cookies. Provide ${formatEnvNames(options?.envCookieNames)} or create ${storageStatePath} with the Playwright setup project.`,
  );
}

function getAuthCookieFromEnv(envCookieNames = DEFAULT_COOKIE_ENV_NAMES) {
  for (const envCookieName of envCookieNames) {
    const value = process.env[envCookieName];
    if (value) return value;
  }

  return null;
}

async function getAuthCookieFromStorageState(storageStatePath: string) {
  let storageState: StorageState;
  try {
    storageState = JSON.parse(await readFile(storageStatePath, "utf8")) as StorageState;
  } catch (error) {
    if (isFileNotFoundError(error)) return null;
    throw error;
  }

  return formatCookieHeader(storageState.cookies);
}

function formatCookieHeader(cookies: StorageState["cookies"]) {
  const cookie = cookies
    ?.filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  return cookie || null;
}

function isFileNotFoundError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function formatEnvNames(envCookieNames = DEFAULT_COOKIE_ENV_NAMES) {
  return envCookieNames.join(" or ");
}
