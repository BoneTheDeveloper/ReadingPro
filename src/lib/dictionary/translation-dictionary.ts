import { createModuleLogger } from "@/lib/core/logger";
import {
  buildDictionaryKey,
  getDictionaryEntry,
  normalizeDictionaryTerm,
} from "@/lib/db/translation-queries";

const log = createModuleLogger("dictionary:translation");

export interface DictionaryTranslation {
  translation: string;
  type?: string;
  pronunciation?: string;
  examples: string[];
  relatedWords: string[];
  confidence: number;
  source: string;
}

interface DictionaryLookupInput {
  text: string;
  context: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}

export async function lookupDictionaryTranslation({
  text,
  sourceLanguage,
  targetLanguage,
}: DictionaryLookupInput): Promise<DictionaryTranslation | null> {
  const normalizedTerm = normalizeDictionaryTerm(text);
  const normalizedKey = buildDictionaryKey({
    normalizedTerm,
    sourceLanguage,
    targetLanguage,
  });

  const dbEntry = await getDictionaryEntry(normalizedKey);
  if (!dbEntry) {
    log.debug(
      {
        context: {
          sourceLanguage,
          targetLanguage,
          termLength: normalizedTerm.length,
        },
      },
      "Dictionary lookup missed",
    );
    return null;
  }

  return {
    translation: dbEntry.translation,
    type: dbEntry.type ?? undefined,
    pronunciation: dbEntry.pronunciation ?? undefined,
    examples: Array.isArray(dbEntry.examples) ? dbEntry.examples.filter((item: unknown): item is string => typeof item === "string") : [],
    relatedWords: Array.isArray(dbEntry.relatedWords) ? dbEntry.relatedWords.filter((item: unknown): item is string => typeof item === "string") : [],
    confidence: dbEntry.confidence,
    source: dbEntry.source,
  };
}
