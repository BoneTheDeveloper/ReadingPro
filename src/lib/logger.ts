import "server-only";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const log = pino({
  base: undefined,
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
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

// Convenience: tag logs by module
export function moduleLog(module: string) {
  return log.child({ module });
}
