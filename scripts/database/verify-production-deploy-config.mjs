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

// PRODUCTION_URL is a deploy-verification input. Keep it as a bare host so the
// script can compare it against NEXT_PUBLIC_SITE_URL without accepting mixed
// protocols or path fragments.
const productionHost = process.env.PRODUCTION_URL;
if (!productionHost || productionHost.includes("://")) {
  fail("PRODUCTION_URL must be a bare host such as app.example.com.");
}

let expectedProductionUrl = null;
if (productionHost && !productionHost.includes("://")) {
  expectedProductionUrl = new URL(`https://${productionHost}`);
}

const siteUrl = parseUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
if (siteUrl && siteUrl.protocol !== "https:") {
  fail("NEXT_PUBLIC_SITE_URL must use https for production verification.");
}

if (siteUrl && expectedProductionUrl && siteUrl.host !== expectedProductionUrl.host) {
  fail(`NEXT_PUBLIC_SITE_URL host ${siteUrl.host} must match PRODUCTION_URL ${expectedProductionUrl.host}.`);
}

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

if (process.env.SENTRY_AUTH_TOKEN && !process.env.CI) {
  fail("SENTRY_AUTH_TOKEN is CI-only and must not be present outside CI.");
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Verified production deploy config for ${expectedProductionUrl.host}.`);
