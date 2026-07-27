import { moduleLog } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export interface AITraceContext {
  operation: string;
  feature: string;
  model: string;
}

export async function withAITrace<T>(
  ctx: AITraceContext,
  fn: () => Promise<T>,
): Promise<T> {
  const log = moduleLog(`ai:${ctx.feature}`);
  const start = Date.now();

  try {
    const result = await fn();
    log.info(
      { ...ctx, latencyMs: Date.now() - start },
      "AI call completed",
    );
    return result;
  } catch (error) {
    log.error(
      { err: error, ...ctx, latencyMs: Date.now() - start },
      "AI call failed",
    );
    Sentry.captureException(error, {
      tags: {
        "ai.operation": ctx.operation,
        "ai.feature": ctx.feature,
        "ai.model": ctx.model,
      },
    });
    throw error;
  }
}
