import 'server-only';
import * as Sentry from "@sentry/nextjs";
import type { QuickTranslation } from "@/lib/ai/translator";
import { translateWithProvider } from "@/lib/translation/translation-provider";
import type { TranslateServiceInput, TranslateServiceContext } from "./inline-translate.service";

export async function resolveSentenceTranslate(
  input: TranslateServiceInput,
  ctx: TranslateServiceContext,
): Promise<QuickTranslation> {
  const providerResult = await measureStep(ctx, "nonAiProvider", () =>
    Sentry.startSpan(
      {
        name: "sentence-translate:resolve",
        op: "function",
        attributes: {
          "translation.source_id": input.sourceId,
          "translation.text_length": input.text.length,
          "translation.target_language": input.targetLanguage,
          "user.id": ctx.userId,
        },
      },
      () =>
        translateWithProvider({
          text: input.text,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
        }),
    ),
  );

  ctx.requestLog.info(
    {
      context: {
        scope: "sentence",
        provider: providerResult.provider,
        selectedTextLength: input.text.length,
      },
    },
    "Sentence translate resolved",
  );

  return {
    translation: providerResult.translation,
    type: null,
    provider: providerResult.provider,
  };
}

async function measureStep<T>(
  ctx: TranslateServiceContext,
  step: string,
  callback: () => Promise<T>,
): Promise<T> {
  if (!ctx.performanceTracker) return callback();
  const { runWithPrismaQueryStep } = await import("@/lib/observability/prisma-query-metrics");
  return ctx.performanceTracker.measure(step, () => runWithPrismaQueryStep(step, callback));
}
