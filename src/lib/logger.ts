import "server-only";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const devOptions: pino.LoggerOptions = {
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
      errorLikeObjectKeys: ["err", "error"],
      singleLine: false,
    },
  },
};

const prodOptions: pino.LoggerOptions = {
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const log = pino({
  base: isDev ? undefined : { env: process.env.VERCEL_ENV ?? "local" },
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.token',
    ],
    remove: true,
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  ...(isDev ? devOptions : prodOptions),
});
