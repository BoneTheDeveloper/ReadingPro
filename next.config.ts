import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// --- CSP Directives ---
// Each directive on its own line for readability.
// Joined with spaces (no newlines) for the final header value.

const csp = {
  defaultSrc: "default-src 'self'",
  scriptSrc: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel-scripts.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  styleSrc: "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  imgSrc: "img-src 'self' blob: data: https://img.clerk.com",
  fontSrc: "font-src 'self' https://fonts.gstatic.com",
  connectSrc: [
    "connect-src 'self'",
    "https://*.sentry.io",
    "https://vitals.vercel-insights.com",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
  ].join(" "),
  objectSrc: "object-src 'none'",
  baseUri: "base-uri 'self'",
  formAction: "form-action 'self'",
  frameAncestors: "frame-ancestors 'none'",
  frameSrc: "frame-src 'self' https://*.clerk.com https://challenges.cloudflare.com",
  workerSrc: "worker-src 'self' blob:",
  upgradeInsecure: "upgrade-insecure-requests",
};

const cspHeader = Object.values(csp).join("; ");

// --- Security Headers ---

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// --- Next.js Config ---

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
