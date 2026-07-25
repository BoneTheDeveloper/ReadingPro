import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

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
    // One Tap exchanges the ID token with our auth API.
    "https://accounts.google.com",
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
  // pdf-parse is a Node-only lib used by the upload worker; keep it external so
  // it is not bundled/traced into the server build.
  serverExternalPackages: ["pino", "pino-pretty", "pdf-parse"],
  experimental: {
    // Raw file uploads flow through a Server Action; the validation cap is 10MB
    // while the Server Action body default is 1MB.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
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

// --- Sentry Wrapper ---
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG || "pham-dac-luc",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
