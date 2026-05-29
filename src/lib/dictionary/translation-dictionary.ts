import type { Prisma } from "@/generated/prisma/client";
import { createModuleLogger } from "@/lib/core/logger";
import {
  buildDictionaryKey,
  getDictionaryEntry,
  normalizeDictionaryTerm,
  upsertDictionaryEntry,
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

const LOCAL_DICTIONARY: Record<string, DictionaryTranslation> = {
  "algorithmic bias": {
    translation: "thiên lệch thuật toán",
    type: "noun phrase",
    examples: ["Algorithmic bias can affect hiring decisions."],
    relatedWords: ["bias", "fairness", "machine learning"],
    confidence: 0.96,
    source: "local",
  },
  algorithm: {
    translation: "thuật toán",
    type: "noun",
    examples: ["The algorithm sorts the data."],
    relatedWords: ["algorithmic", "model", "procedure"],
    confidence: 0.92,
    source: "local",
  },
  bias: {
    translation: "thiên lệch",
    type: "noun",
    examples: ["The study may contain bias."],
    relatedWords: ["prejudice", "preference", "fairness"],
    confidence: 0.76,
    source: "local",
  },
  data: {
    translation: "dữ liệu",
    type: "noun",
    examples: ["The data supports the conclusion."],
    relatedWords: ["dataset", "evidence", "information"],
    confidence: 0.9,
    source: "local",
  },
  evidence: {
    translation: "bằng chứng",
    type: "noun",
    examples: ["The evidence is strong."],
    relatedWords: ["proof", "support", "finding"],
    confidence: 0.88,
    source: "local",
  },
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function contextualLocalMatch(normalizedTerm: string, normalizedContext: string) {
  if (normalizedTerm === "bias" && normalizedContext.includes("algorithmic bias")) {
    return {
      ...LOCAL_DICTIONARY["algorithmic bias"],
      source: "local-context",
      confidence: 0.9,
    };
  }

  return LOCAL_DICTIONARY[normalizedTerm] ?? null;
}

export async function lookupDictionaryTranslation({
  text,
  context,
  sourceLanguage,
  targetLanguage,
}: DictionaryLookupInput): Promise<DictionaryTranslation | null> {
  const normalizedTerm = normalizeDictionaryTerm(text);
  const normalizedContext = normalizeDictionaryTerm(context);
  const normalizedKey = buildDictionaryKey({
    normalizedTerm,
    sourceLanguage,
    targetLanguage,
  });

  const localMatch = contextualLocalMatch(normalizedTerm, normalizedContext);
  if (localMatch) {
    await upsertDictionaryEntry({
      normalizedKey,
      normalizedTerm,
      sourceLanguage,
      targetLanguage,
      translation: localMatch.translation,
      type: localMatch.type,
      pronunciation: localMatch.pronunciation,
      examples: toJsonValue(localMatch.examples),
      relatedWords: toJsonValue(localMatch.relatedWords),
      source: localMatch.source,
      confidence: localMatch.confidence,
    });
    return localMatch;
  }

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
    examples: Array.isArray(dbEntry.examples) ? dbEntry.examples.filter((item): item is string => typeof item === "string") : [],
    relatedWords: Array.isArray(dbEntry.relatedWords) ? dbEntry.relatedWords.filter((item): item is string => typeof item === "string") : [],
    confidence: dbEntry.confidence,
    source: dbEntry.source,
  };
}
