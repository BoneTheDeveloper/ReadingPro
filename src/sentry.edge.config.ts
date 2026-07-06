import * as Sentry from "@sentry/nextjs";

if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    spotlight: process.env.NODE_ENV === "development",
    // prismaIntegration is Node-only; the edge Sentry build has no such export.
    integrations: [Sentry.consoleLoggingIntegration()],
    sendDefaultPii: true,
    tracesSampleRate: 1,
    enableLogs: true,
    debug: false,
  });
}
