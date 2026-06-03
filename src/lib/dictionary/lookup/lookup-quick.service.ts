import { createModuleLogger } from "@/lib/core/logger";
import { normalizeDictionaryTerm } from "../shared/normalize-dictionary-term";
import { resolveQuickDictionaryLookupSql } from "./lookup.service";

const log = createModuleLogger("dictionary:quick-resolver");

export interface QuickDictionaryResult {
  translation: string;
  type: string | null;
  provider: "dictionary" | "fallback";
}

interface QuickResolverInput {
  text: string;
  context: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export async function resolveQuickDictionaryTranslation(
  input: QuickResolverInput,
): Promise<QuickDictionaryResult> {
  const normalizedText = normalizeDictionaryTerm(input.text);

  const dto = await resolveQuickDictionaryLookupSql(normalizedText, {
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  if (dto) {
    log.debug(
      { context: { provider: "dictionary", senseId: dto.senseId } },
      "Dictionary translation resolved",
    );
    return {
      translation: dto.translation,
      type: null,
      provider: "dictionary",
    };
  }

  log.debug(
    { context: { provider: "fallback" } },
    "Dictionary fallback returning normalized text",
  );
  return {
    translation: normalizedText,
    type: null,
    provider: "fallback",
  };
}
