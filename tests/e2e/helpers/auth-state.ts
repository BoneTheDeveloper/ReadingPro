import { readFile } from "node:fs/promises";
import { createServerClient } from "@supabase/ssr";

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

  const credentialsCookie = await getAuthCookieFromSupabaseCredentials();
  if (credentialsCookie) return credentialsCookie;

  throw new Error(
    `Missing auth cookies. Provide ${formatEnvNames(options?.envCookieNames)}, create ${storageStatePath}, or set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD.`,
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

async function getAuthCookieFromSupabaseCredentials() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey || !email || !password) {
    return null;
  }

  const responseCookies: StorageState["cookies"] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return responseCookies;
      },
      setAll(cookiesToSet) {
        responseCookies.splice(0, responseCookies.length, ...cookiesToSet);
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to sign in E2E test user: ${error.message}`);
  }

  return formatCookieHeader(responseCookies);
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
