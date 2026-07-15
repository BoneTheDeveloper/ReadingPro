import "server-only";
import { moduleLog } from "@/lib/observability/logger";
import { resolveQuickDictionaryTranslation, type QuickTranslation } from "@/features/dictionary/server/services/lookup-quick";
import type { TranslateServiceInput } from "./inline-translate";

const log = moduleLog("reading:word-translate");

export async function resolveWordTranslate(
  input: TranslateServiceInput,
): Promise<QuickTranslation> {
  const result = await resolveQuickDictionaryTranslation({
    text: input.text,
    context: input.context,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  if (!result) {
    log.info("Word translate not found");
    return { translation: "", source: "none", provider: "none" };
  }

  log.info({ provider: result.provider }, "Word translate resolved");
  return result;
}
