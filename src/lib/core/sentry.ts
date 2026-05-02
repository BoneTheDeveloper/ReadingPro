import type { BrowserOptions } from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export function isSentryEnabled(): boolean {
  return SENTRY_DSN.length > 0;
}

const isDev = process.env.NODE_ENV === "development";

export function getSentryConfig() {
  return {
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: isDev ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    enableLogs: true,

    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      // Strip PII from breadcrumbs and extra data
      const piiRegex = /[\w.+-]+@[\w-]+\.[\w.]+/g;
      const stripPii = (obj: unknown): unknown => {
        if (typeof obj === "string") return obj.replace(piiRegex, "[email]");
        if (Array.isArray(obj)) return obj.map(stripPii);
        if (obj && typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, stripPii(v)])
          );
        }
        return obj;
      };
      if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(b => ({ ...b, data: b.data ? stripPii(b.data) as Record<string, unknown> : undefined }));
      if (event.extra) event.extra = stripPii(event.extra) as Record<string, unknown>;
      // Strip local file paths from stack traces
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.stacktrace?.frames) {
            for (const frame of ex.stacktrace.frames) {
              if (frame.filename?.startsWith("/")) {
                frame.filename = frame.filename.replace(/^.*\//, "app:///");
              }
            }
          }
        }
      }
      return event;
    },
  } satisfies Pick<BrowserOptions, "dsn" | "environment" | "tracesSampleRate" | "replaysSessionSampleRate" | "replaysOnErrorSampleRate" | "sendDefaultPii" | "beforeSend"> & { enableLogs: boolean };
}
