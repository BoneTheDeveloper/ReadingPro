import 'server-only';
import { normalizeDictionaryTerm } from "../schemas/normalize-dictionary-term";
import { getSourceLabel } from "@/features/dictionary/lib/dictionary-helpers";
import type { DictionarySuggestItemDto } from "@/features/dictionary/schemas/dictionary-response.schema";
import { findSuggestCandidates, type SuggestCandidateRow } from "../db/suggest-repository";

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

  const rows = await findSuggestCandidates(query, options.sourceLanguage);

  return rows.map((row) => mapCandidateRow(row));
}

function mapCandidateRow(row: SuggestCandidateRow): DictionarySuggestItemDto {
  const primaryTranslation = row.primaryTranslation;

  let sourceLabel: string | null = null;
  if (primaryTranslation) {
    sourceLabel = row.aliasType
      ? getSourceLabel(row.aliasType, null)
      : "Dictionary";
  }

  return {
    id: row.id,
    headword: row.headword,
    matchType: row.matchType as DictionarySuggestItemDto["matchType"],
    matchedAlias: row.matchedAlias,
    primaryTranslation,
    sourceLabel,
  };
}
