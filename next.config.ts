import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const isDev = process.env.NODE_ENV !== "production";

// --- CSP Directives ---
// Each directive on its own line for readability.
// Joined with "; " for the final header value.
const csp = {
  defaultSrc: "default-src 'self'",
  scriptSrc: [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://va.vercel-scripts.com",
    // TODO(production): add Frontend API domain of Clerk
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
  ]
    .filter(Boolean)
    .join(" "),
  styleSrc: "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  imgSrc: "img-src 'self' blob: data: https://img.clerk.com",
  fontSrc: "font-src 'self' https://fonts.gstatic.com",
  connectSrc: [
    "connect-src 'self'",
    "https://*.sentry.io",
    "https://vitals.vercel-insights.com",
    // TODO(production): add Clerk Frontend API domain
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
  ].join(" "),
  objectSrc: "object-src 'none'",
  baseUri: "base-uri 'self'",
  formAction: "form-action 'self'",
  frameAncestors: "frame-ancestors 'none'",
  frameSrc:
    "frame-src 'self' https://*.clerk.com https://challenges.cloudflare.com",
  workerSrc: "worker-src 'self' blob:",
  upgradeInsecure: "upgrade-insecure-requests",
};

const cspHeader = Object.values(csp).join("; ");

// --- Security Headers ---
const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// --- Next.js Config ---
const nextConfig: NextConfig = {
  // NEXT_DIST_DIR is a build/performance tooling override. Normal app builds
  // should omit it and use Next.js' default .next directory.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  serverExternalPackages: ["pino", "pino-pretty"],
  allowedDevOrigins: ["host.docker.internal"],
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// --- Sentry Wrapper ---
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG || "pham-dac-luc",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
