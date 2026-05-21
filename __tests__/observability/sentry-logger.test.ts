import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function importActualSentryCore(dsn: string, nodeEnv = "production") {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SENTRY_DSN = dsn;
  process.env.NODE_ENV = nodeEnv;
  return import("@/lib/core/sentry");
}

describe("Sentry and logger configuration", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("reports disabled when no DSN was present at module load", async () => {
    const { isSentryEnabled, getSentryConfig } = await importActualSentryCore("");

    expect(isSentryEnabled()).toBe(false);
    expect(getSentryConfig()).toMatchObject({
      dsn: "",
      environment: "production",
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      enableLogs: true,
    });
  });

  it("enables Sentry with a DSN and scrubs request headers, emails, and local stack paths", async () => {
    const { isSentryEnabled, getSentryConfig } = await importActualSentryCore("https://dsn.example/1", "development");
    const config = getSentryConfig();
    const event = config.beforeSend({
      request: {
        headers: {
          authorization: "Bearer secret",
          cookie: "session=secret",
          "x-test": "kept",
        },
      },
      breadcrumbs: [{ data: { email: "reader@example.test" } }],
      extra: { nested: ["owner@example.test"] },
      exception: {
        values: [
          {
            stacktrace: {
              frames: [{ filename: "/home/luc/project/src/app/page.tsx" }],
            },
          },
        ],
      },
    });

    expect(isSentryEnabled()).toBe(true);
    expect(config.tracesSampleRate).toBe(1);
    expect(event.request?.headers).toEqual({ "x-test": "kept" });
    expect(event.breadcrumbs?.[0].data).toEqual({ email: "[email]" });
    expect(event.extra).toEqual({ nested: ["[email]"] });
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0].filename).toBe("app:///page.tsx");
  });

  it("initializes server and edge config modules only when Sentry is enabled", async () => {
    await importActualSentryCore("https://dsn.example/1");
    await import("../../sentry.server.config");
    await import("../../sentry.edge.config");

    expect(Sentry.init).toHaveBeenCalledTimes(2);
    expect(Sentry.pinoIntegration).toHaveBeenCalledWith({
      error: { levels: ["error", "fatal"], handled: true },
      log: { levels: ["warn", "error", "fatal"] },
    });
  });

  it("registers the runtime-specific instrumentation module and exports request error capture", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://dsn.example/1";
    process.env.NEXT_RUNTIME = "nodejs";
    vi.resetModules();

    const instrumentation = await import("@/instrumentation");
    await instrumentation.register();

    expect(instrumentation.onRequestError).toBe(Sentry.captureRequestError);
    expect(Sentry.init).toHaveBeenCalled();
  });

  it("initializes client instrumentation with replay and exports router transition capture", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://dsn.example/1";
    vi.resetModules();

    const clientInstrumentation = await import("@/instrumentation-client");

    expect(Sentry.replayIntegration).toHaveBeenCalled();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [expect.objectContaining({ name: "replayIntegration" })],
      }),
    );
    expect(clientInstrumentation.onRouterTransitionStart).toBe(Sentry.captureRouterTransitionStart);
  });

  it("configures the real pino logger with module children in production", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/core/logger");
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "warn";

    const { logger, createModuleLogger } = await import("@/lib/core/logger");
    const child = createModuleLogger("observability:test");

    expect(logger.level).toBe("warn");
    expect(child).toBeDefined();
  });

  it("Sentry example route logs and throws its custom error", async () => {
    const { GET, dynamic } = await import("@/app/api/sentry-example-api/route");

    expect(dynamic).toBe("force-dynamic");
    expect(() => GET()).toThrow("This error is raised on the backend called by the example page.");
    expect(Sentry.logger.info).toHaveBeenCalledWith("Sentry example API called");
  });
});
