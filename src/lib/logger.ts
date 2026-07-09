import "server-only";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

type LogContext = Record<string, unknown>;
type LogFields = Record<string, unknown> & {
  context?: LogContext;
};
type LogValue = LogFields | Error | string;
type LogLevel = "debug" | "info" | "warn" | "error";

type LoggableError = {
  message?: unknown;
  name?: unknown;
  type?: unknown;
  code?: unknown;
  meta?: unknown;
  statusCode?: unknown;
  clientVersion?: unknown;
};

const PROD_STACK_MAX_LINES = 6;

// Base error class for operational errors (business logic).
// withAction() uses isOperational to distinguish business errors from unexpected errors.
class AppError extends Error {
  isOperational = true;
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toNumberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
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

function compactStack(stack: string | undefined) {
  if (!stack || isDev) return stack;
  const lines = stack.split("\n");
  if (lines.length <= PROD_STACK_MAX_LINES) return stack;
  return [
    ...lines.slice(0, PROD_STACK_MAX_LINES),
    `    ... ${lines.length - PROD_STACK_MAX_LINES} more lines`,
  ].join("\n");
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
    toStringValue(loggable.message) ??
    String(error);
  const prismaError = isPrismaError(loggable, serialized);

  return removeUndefined({
    ...serialized,
    message: prismaError ? compactErrorMessage(rawMessage) : rawMessage,
    // Keep code + meta of Prisma (P2002, target fields, model name...)
    code: toStringValue(loggable.code) ?? toStringValue(serialized.code),
    meta: isRecord(loggable.meta) ? loggable.meta : undefined,
    statusCode:
      toNumberValue(serialized.statusCode) ??
      toNumberValue(loggable.statusCode),
    // Production: keep stack but minimize
    stack: compactStack(toStringValue(serialized.stack)),
  });
}

const logger = pino({
  base: undefined,
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  serializers: {
    err: compactError,
    error: compactError,
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

function createModuleLogger(module: string, context?: LogContext) {
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

type ContextLogger = {
  child(context?: LogContext): ContextLogger;
  bindings(): Record<string, unknown>;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
};

type LogFn = (value: LogValue, message?: string, ...args: unknown[]) => void;

function createContextLogger(
  parent: pino.Logger,
  baseContext: LogContext,
): ContextLogger {
  const cleanBaseContext = removeUndefined(baseContext);

  function write(
    level: LogLevel,
    value: LogValue,
    message?: string,
    ...args: unknown[]
  ) {
    // log.error(err) or log.error(err, "msg") — group to { err }
    if (value instanceof Error) {
      parent[level](
        mergeLogFields(cleanBaseContext, { err: value }),
        message ?? value.message,
        ...args,
      );
      return;
    }

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
    debug: (value, message, ...args) => write("debug", value, message, ...args),
    info: (value, message, ...args) => write("info", value, message, ...args),
    warn: (value, message, ...args) => write("warn", value, message, ...args),
    error: (value, message, ...args) => write("error", value, message, ...args),
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
      // Handle request can be trace even missing header.
      crypto.randomUUID(),
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

export type { ContextLogger, LogContext };
export {
  AppError,
  logger,
  createModuleLogger,
  createRequestLogger,
  createRequestLogContext,
};
