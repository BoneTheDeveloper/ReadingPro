import * as Sentry from "@sentry/nextjs";

if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    spotlight: process.env.NODE_ENV === "development",
    integrations: [
      Sentry.prismaIntegration(),
      Sentry.pinoIntegration({
        error: { levels: [] },
        log: { levels: ["info", "warn", "error"] },
      }),
    ],
    sendDefaultPii: true,
    tracesSampleRate: 1,
    enableLogs: true,
    debug: false,
  });
}
