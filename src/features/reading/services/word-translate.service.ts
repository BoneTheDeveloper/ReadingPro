import 'server-only';
import { resolveQuickDictionaryTranslation, type QuickTranslation } from "@/features/dictionary/services/lookup-quick.service";
import type { TranslateServiceInput, TranslateServiceContext } from "./inline-translate.service";

export async function resolveWordTranslate(
  input: TranslateServiceInput,
  ctx: TranslateServiceContext,
): Promise<QuickTranslation> {
  const result = await resolveQuickDictionaryTranslation({
    text: input.text,
    context: input.context,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  if (!result) {
    ctx.log.info({ context: { scope: "word" } }, "Word translate not found");
    return { translation: "", source: "none", provider: "none" };
  }

  ctx.log.info(
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
