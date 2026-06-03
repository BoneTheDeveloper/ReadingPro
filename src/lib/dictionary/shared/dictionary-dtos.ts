export interface DictionaryTranslationDto {
  id: string;
  senseId: string;
  targetLanguage: "vi";
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number | null;
  status: "draft" | "reviewed" | "approved" | "deprecated";
  sourceType: "seed" | "manual" | "provider" | "llm" | "mixed";
  sourceName: string | null;
  reviewedAt: string | null;
  sourceLabel: string;
}

export interface DictionarySenseDto {
  id: string;
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null;
  tags: string[];
  usageRank: number;
  translations: DictionaryTranslationDto[];
}

export interface DictionaryEntryDto {
  id: string;
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  senses: DictionarySenseDto[];
}

export interface DictionaryMissDto {
  headword: string;
  found: false;
}

export type DictionaryLookupResult = DictionaryEntryDto | DictionaryMissDto;

export interface DictionarySuggestItemDto {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "prefix" | "phrase";
  matchedAlias: string | null;
  primaryTranslation: string | null;
  sourceLabel: string | null;
}

export interface DictionarySearchResultDto {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "phrase" | "prefix" | "contains";
  matchedText: string | null;
  primaryTranslation: string | null;
  partOfSpeech: string | null;
  sourceLabel: string | null;
}

const SOURCE_LABELS: Record<string, Record<string, string>> = {
  seed: {
    "seed:reviewed": "Dictionary",
    "seed:core": "Core Vocabulary",
    default: "Seed Data",
  },
  manual: { default: "Manual Entry" },
  provider: { default: "Provider" },
  llm: { default: "AI Generated" },
  mixed: { default: "Mixed Source" },
};

export function getSourceLabel(sourceType: string, sourceName: string | null): string {
  const typeGroup = SOURCE_LABELS[sourceType];
  if (!typeGroup) return sourceType;
  if (sourceName && typeGroup[`${sourceType}:${sourceName}`]) {
    return typeGroup[`${sourceType}:${sourceName}`];
  }
  if (sourceName) return sourceName;
  return typeGroup.default ?? sourceType;
}

export const RUNTIME_STATUSES = ["reviewed", "approved"] as const;
export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];

export const VALID_TRANSLATION_STATUSES = ["draft", "reviewed", "approved", "deprecated"] as const;
export const VALID_SOURCE_TYPES = ["seed", "manual", "provider", "llm", "mixed"] as const;
