const failures = [];

function fail(message) {
  failures.push(message);
}

function parseUrl(name, value) {
  if (!value) {
    fail(`Missing ${name}.`);
    return null;
  }

  try {
    return new URL(value);
  } catch {
    fail(`${name} must be a valid absolute URL.`);
    return null;
  }
}

const siteUrl = parseUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
if (siteUrl && siteUrl.protocol !== "https:") {
  fail("NEXT_PUBLIC_SITE_URL must use https for production verification.");
}

// CI-only env checks — these validate that secrets don't leak into the Vercel
// build runtime. Skip when running inside GitHub Actions (CI=true).
if (!process.env.CI) {
  if (process.env.DIRECT_URL) {
    fail("DIRECT_URL must not be present in the app runtime environment.");
  }

  for (const name of ["NEON_API_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]) {
    if (process.env[name]) {
      fail(`${name} is CI/provider-only and must not be present in the app runtime environment.`);
    }
  }

  for (const name of ["TRANSLATE_PERFORMANCE_FIXTURES", "DICTIONARY_PERFORMANCE_FIXTURES"]) {
    if (process.env[name]) {
      fail(`${name} must be unset in production runtime.`);
    }
  }

  if (process.env.SENTRY_AUTH_TOKEN) {
    fail("SENTRY_AUTH_TOKEN is CI-only and must not be present outside CI.");
  }
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Verified production deploy config for ${siteUrl.host}.`);
