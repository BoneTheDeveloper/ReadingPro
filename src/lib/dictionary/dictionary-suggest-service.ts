import { normalizeDictionaryTerm } from "./normalize-dictionary-term";
import { getSourceLabel, type DictionarySuggestItemDto } from "./dictionary-dtos";
import {
  findEntriesByHeadwordPrefix,
  findEntriesByAliasPrefix,
} from "./dictionary-suggest-repository";

export interface SuggestOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

export async function suggestDictionaryTerms(
  query: string,
  options: SuggestOptions,
): Promise<DictionarySuggestItemDto[]> {
  const normalizedQuery = normalizeDictionaryTerm(query);
  if (normalizedQuery.length < 2) return [];

  const [headwordResults, aliasResults] = await Promise.all([
    findEntriesByHeadwordPrefix(query, options.sourceLanguage),
    findEntriesByAliasPrefix(query, options.sourceLanguage),
  ]);

  const headwordItems = headwordResults.map((entry) =>
    buildHeadwordSuggestItem(entry, normalizedQuery),
  );

  const aliasItems = aliasResults.map((entry) =>
    buildAliasSuggestItem(entry, normalizedQuery),
  );

  const seen = new Set<string>();
  const merged: DictionarySuggestItemDto[] = [];

  for (const item of [...headwordItems, ...aliasItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  merged.sort((a, b) => rankScore(a) - rankScore(b));
  return merged;
}

function extractPrimaryTranslation(
  entry: { senses?: Array<{ translations?: Array<{ translation: string }> }> },
): string | null {
  const sense = entry.senses?.[0];
  return sense?.translations?.[0]?.translation ?? null;
}

function buildHeadwordSuggestItem(
  entry: {
    id: string;
    headword: string;
    normalizedHeadword: string;
    senses?: Array<{ translations?: Array<{ translation: string }> }>;
    aliases?: Array<{ normalizedAlias: string }>;
  },
  normalizedQuery: string,
): DictionarySuggestItemDto {
  const matchType = entry.normalizedHeadword === normalizedQuery ? "exact" : "prefix";
  const primaryTranslation = extractPrimaryTranslation(entry);

  return {
    id: entry.id,
    headword: entry.headword,
    matchType,
    matchedAlias: null,
    primaryTranslation,
    sourceLabel: primaryTranslation ? "Dictionary" : null,
  };
}

function buildAliasSuggestItem(
  entry: {
    id: string;
    headword: string;
    normalizedHeadword: string;
    matchedAlias: string;
    aliasType: string;
    senses?: Array<{ translations?: Array<{ translation: string }> }>;
  },
  normalizedQuery: string,
): DictionarySuggestItemDto {
  const matchType = entry.matchedAlias === normalizedQuery ? "exact" : "prefix";
  const primaryTranslation = extractPrimaryTranslation(entry);

  return {
    id: entry.id,
    headword: entry.headword,
    matchType: matchType === "exact" ? "alias" : "prefix",
    matchedAlias: entry.matchedAlias,
    primaryTranslation,
    sourceLabel: primaryTranslation ? getSourceLabel(entry.aliasType, null) : null,
  };
}

function rankScore(item: DictionarySuggestItemDto): number {
  switch (item.matchType) {
    case "exact":
      return 0;
    case "alias":
      return 1;
    case "prefix":
      return 2;
    case "phrase":
      return 3;
  }
}
