import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function importActualSentryCore(dsn: string, nodeEnv = "production") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", dsn);
  vi.stubEnv("NODE_ENV", nodeEnv);
  return import("@/lib/core/sentry");
}

describe("Sentry and logger configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
    const sentryEvent = {
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
    } as unknown as Parameters<NonNullable<typeof config.beforeSend>>[0];
    const event = config.beforeSend(sentryEvent);

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
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://dsn.example/1");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.resetModules();

    const instrumentation = await import("@/instrumentation");
    await instrumentation.register();

    expect(instrumentation.onRequestError).toBe(Sentry.captureRequestError);
    expect(Sentry.init).toHaveBeenCalled();
  });

  it("initializes client instrumentation with replay and exports router transition capture", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://dsn.example/1");
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
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "warn");

    const { logger, createModuleLogger } = await import("@/lib/core/logger");
    const child = createModuleLogger("observability:test", {
      requestId: "req-1",
      userId: "user-1",
    });

    expect(logger.level).toBe("warn");
    expect(child.bindings()).toMatchObject({
      module: "observability:test",
      requestId: "req-1",
      userId: "user-1",
    });
    expect(child).toBeDefined();
  });

  it("serializes Prisma errors with compact messages and safe status codes", async () => {
    const prismaMessage = [
      "",
      "Invalid `db.studyChatMessage.findMany()` invocation in",
      "/home/luc/Project/english-reading-training-app/.next/dev/server/chunks/example.js:1215:164",
      "",
      "The table `public.study_chat_messages` does not exist in the current database.",
    ].join("\n");
    const prismaError = Object.assign(new Error(prismaMessage), {
      name: "PrismaClientKnownRequestError",
      code: "P2021",
      clientVersion: "7.8.0",
      statusCode: { unexpected: true },
    });

    vi.resetModules();
    vi.doUnmock("@/lib/core/logger");
    vi.stubEnv("NODE_ENV", "production");
    const productionLogger = await import("@/lib/core/logger");
    const productionError = productionLogger.serializeErrorForLog(prismaError) as Record<string, unknown>;

    expect(productionError.message).toBe(
      "The table `public.study_chat_messages` does not exist in the current database.",
    );
    expect(productionError.statusCode).toBeUndefined();
    expect(productionError.stack).toBeUndefined();
    expect(productionError.code).toBe("P2021");

    vi.resetModules();
    vi.doUnmock("@/lib/core/logger");
    vi.stubEnv("NODE_ENV", "development");
    const developmentLogger = await import("@/lib/core/logger");
    const developmentError = developmentLogger.serializeErrorForLog(prismaError) as Record<string, unknown>;

    expect(developmentError.stack).toEqual(expect.any(String));
  });

  it("keeps non-Prisma error messages unchanged", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/core/logger");
    vi.stubEnv("NODE_ENV", "production");

    const { serializeErrorForLog } = await import("@/lib/core/logger");
    const message = [
      "Invalid `input` value",
      "The table `not_a_prisma_hint` is part of user content",
      "Keep the original message intact.",
    ].join("\n");

    expect(serializeErrorForLog(new Error(message)).message).toBe(message);
  });

  it("Sentry example route logs and throws its custom error", async () => {
    const { GET, dynamic } = await import("@/app/api/sentry-example-api/route");

    expect(dynamic).toBe("force-dynamic");
    expect(() => GET()).toThrow("This error is raised on the backend called by the example page.");
    expect(Sentry.logger.info).toHaveBeenCalledWith("Sentry example API called");
  });
});
