import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

type LoggableError = {
  message?: unknown;
  code?: unknown;
  statusCode?: unknown;
  stack?: unknown;
  clientVersion?: unknown;
};

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toNumberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function removeUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  );
}

function compactErrorMessage(message: string) {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    lines.find((line) => line.startsWith("The table `")) ??
    lines.find((line) => line.startsWith("Invalid `")) ??
    lines.at(-1) ??
    message
  );
}

function isPrismaError(error: LoggableError) {
  const code = toStringValue(error.code);
  return Boolean(code?.startsWith("P") && error.clientVersion);
}

export function serializeErrorForLog(error: unknown) {
  const serialized = pino.stdSerializers.err(error as Error);
  const loggable = error as LoggableError;
  const rawMessage =
    toStringValue(serialized.message) ??
    toStringValue(loggable?.message) ??
    String(error);
  const prismaError = isPrismaError(loggable);

  return removeUndefined({
    ...serialized,
    message: prismaError ? compactErrorMessage(rawMessage) : rawMessage,
    statusCode:
      toNumberValue(serialized.statusCode) ??
      toNumberValue(loggable?.statusCode),
    stack: isDev || !prismaError ? serialized.stack : undefined,
  });
}

const logger = pino({
  base: undefined,
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  serializers: {
    err: serializeErrorForLog,
    error: serializeErrorForLog,
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

function createModuleLogger(module: string, context?: Record<string, unknown>) {
  return logger.child({ module, ...context });
}

export { logger, createModuleLogger };
