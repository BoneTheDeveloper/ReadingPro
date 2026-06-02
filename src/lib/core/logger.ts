import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

type LogContext = Record<string, unknown>;
type LogFields = Record<string, unknown> & {
  context?: LogContext;
};
type LogValue = LogFields | string;
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

type LoggableError = {
  message?: unknown;
  name?: unknown;
  type?: unknown;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function compactErrorMessage(message: string) {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    lines.find((line) => line.startsWith("The table `")) ??
    lines.find((line) => line.startsWith("Unknown argument `")) ??
    lines.find((line) => line.startsWith("Unknown field `")) ??
    lines.find((line) => line.startsWith("Missing required argument")) ??
    lines.find((line) => line.startsWith("Argument `")) ??
    lines.find((line) => line.startsWith("Invalid value")) ??
    lines.find((line) => line.startsWith("Invalid `")) ??
    lines.at(-1) ??
    message
  );
}

function isPrismaError(error: LoggableError, serialized: LoggableError) {
  const code = toStringValue(error.code);
  const name = toStringValue(error.name);
  const type = toStringValue(serialized.type);
  return Boolean(
    (code?.startsWith("P") && error.clientVersion) ||
      name?.startsWith("PrismaClient") ||
      type?.startsWith("PrismaClient"),
  );
}

export function compactError(error: unknown) {
  const serialized = pino.stdSerializers.err(error as Error);
  const loggable = error as LoggableError;
  const rawMessage =
    toStringValue(serialized.message) ??
    toStringValue(loggable?.message) ??
    String(error);
  const prismaError = isPrismaError(loggable, serialized);

  return removeUndefined({
    ...serialized,
    message: prismaError ? compactErrorMessage(rawMessage) : rawMessage,
    statusCode:
      toNumberValue(serialized.statusCode) ??
      toNumberValue(loggable?.statusCode),
    stack: isDev || !prismaError ? serialized.stack : undefined,
  });
}

export function serializeError(error: unknown) {
  return compactError(error);
}

export const serializeErrorForLog = serializeError;

const logger = pino({
  base: undefined,
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  serializers: {
    err: serializeError,
    error: serializeError,
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

function mergeLogFields(baseContext: LogContext, fields?: LogFields) {
  const { context, ...rest } = fields ?? {};
  return removeUndefined({
    ...rest,
    context: removeUndefined({
      ...baseContext,
      ...(isRecord(context) ? context : {}),
    }),
  });
}

function createContextLogger(parent: pino.Logger, baseContext: LogContext) {
  const cleanBaseContext = removeUndefined(baseContext);

  function write(level: LogLevel, value: LogValue, message?: string, ...args: unknown[]) {
    if (isRecord(value)) {
      parent[level](mergeLogFields(cleanBaseContext, value), message, ...args);
      return;
    }

    parent[level](mergeLogFields(cleanBaseContext), value, ...args);
  }

  return {
    child(context?: LogContext) {
      return createContextLogger(parent, {
        ...cleanBaseContext,
        ...(context ? removeUndefined(context) : {}),
      });
    },
    bindings() {
      return {
        ...parent.bindings(),
        context: cleanBaseContext,
      };
    },
    trace: (value: LogValue, message?: string, ...args: unknown[]) => write("trace", value, message, ...args),
    debug: (value: LogValue, message?: string, ...args: unknown[]) => write("debug", value, message, ...args),
    info: (value: LogValue, message?: string, ...args: unknown[]) => write("info", value, message, ...args),
    warn: (value: LogValue, message?: string, ...args: unknown[]) => write("warn", value, message, ...args),
    error: (value: LogValue, message?: string, ...args: unknown[]) => write("error", value, message, ...args),
    fatal: (value: LogValue, message?: string, ...args: unknown[]) => write("fatal", value, message, ...args),
  };
}

type RequestLogSource = {
  headers?: Headers;
  nextUrl?: {
    pathname?: string;
  };
};

function createRequestLogContext(
  request: RequestLogSource,
  method: string,
  fallbackPath: string,
) {
  return removeUndefined({
    requestId:
      request.headers?.get("x-request-id") ??
      request.headers?.get("x-vercel-id") ??
      undefined,
    path: request.nextUrl?.pathname ?? fallbackPath,
    method,
  });
}

function createRequestLogger(
  module: string,
  requestContext: LogContext,
  moduleContext?: LogContext,
) {
  return createContextLogger(
    createModuleLogger(module, moduleContext),
    requestContext,
  );
}

export { logger, createModuleLogger, createRequestLogger, createRequestLogContext };
