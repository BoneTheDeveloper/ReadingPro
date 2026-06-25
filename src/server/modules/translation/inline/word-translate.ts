import 'server-only';
import * as Sentry from "@sentry/nextjs";
import type { QuickTranslation } from "@/server/ai/translator";
import { resolveQuickDictionaryTranslation } from "@/server/modules/dictionary/lookup/lookup-quick.service";
import type { TranslateServiceInput, TranslateServiceContext } from "./inline-translate.service";

export async function resolveWordTranslate(
  input: TranslateServiceInput,
  ctx: TranslateServiceContext,
): Promise<QuickTranslation> {
  const result = await Sentry.startSpan(
    {
      name: "word-translate:resolve",
      op: "function",
      attributes: {
        "translation.source_id": input.sourceId,
        "translation.text_length": input.text.length,
        "translation.context_length": input.context.length,
        "translation.target_language": input.targetLanguage,
        "user.id": ctx.userId,
      },
    },
    () =>
      resolveQuickDictionaryTranslation({
        text: input.text,
        context: input.context,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
      }),
  );

  ctx.requestLog.info(
    {
      context: {
        scope: "word",
        provider: result.provider,
        selectedTextLength: input.text.length,
      },
    },
    "Word translate resolved",
  );

  return result;
}
