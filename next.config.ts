import { withWorkflow } from "workflow/next";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// --- CSP Directives ---
const csp = {
  defaultSrc: "default-src 'self'",
  scriptSrc: [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://va.vercel-scripts.com",
    "https://challenges.cloudflare.com",
    // Google Identity Services (Better Auth One Tap).
    "https://accounts.google.com",
    "https://apis.google.com",
  ]
    .filter(Boolean)
    .join(" "),
  styleSrc: "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  imgSrc: "img-src 'self' blob: data: https://lh3.googleusercontent.com https://accounts.google.com",
  fontSrc: "font-src 'self' https://fonts.gstatic.com",
  connectSrc: [
    "connect-src 'self'",
    isDev ? "http://localhost:*" : "",
    isDev ? "ws://localhost:*" : "",
    "https://*.sentry.io",
    "https://vitals.vercel-insights.com",
    "https://accounts.google.com",
    "https://*.blob.vercel-storage.com",
  ].filter(Boolean).join(" "),
  objectSrc: "object-src 'none'",
  baseUri: "base-uri 'self'",
  formAction: "form-action 'self'",
  frameAncestors: "frame-ancestors 'self'",
  frameSrc: "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://youtube.com https://accounts.google.com",
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
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  serverExternalPackages: ["pino", "pino-pretty", "pdf-parse"],
  allowedDevOrigins: ["host.docker.internal"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
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

// --- Sentry + Workflow Wrapper ---
export default withSentryConfig(withWorkflow(nextConfig), {
  org: process.env.SENTRY_ORG || "pham-dac-luc",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
