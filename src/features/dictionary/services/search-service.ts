import 'server-only';
import {
  getSourceLabel,
  type DictionarySearchResultDto,
} from "@/contracts/dictionary/dictionary-dtos";
import { normalizeDictionaryTerm } from "../schemas/normalize-dictionary-term";
import {
  searchDictionaryCandidates,
  type DictionarySearchCandidateRow,
} from "../db/search-repository";

export interface DictionarySearchOptions {
  sourceLanguage: string;
  targetLanguage: string;
  limit?: number;
}

const DEFAULT_SEARCH_LIMIT = 8;

export async function searchDictionary(
  query: string,
  options: DictionarySearchOptions,
): Promise<DictionarySearchResultDto[]> {
  const normalizedQuery = normalizeDictionaryTerm(query);
  if (normalizedQuery.length < 2) return [];

  const rows = await searchDictionaryCandidates({
    normalizedQuery,
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage,
    limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
  });

  return rows.map(toSearchResultDto);
}

function toSearchResultDto(row: DictionarySearchCandidateRow): DictionarySearchResultDto {
  return {
    id: row.id,
    headword: row.headword,
    matchType: row.matchType,
    matchedText: row.matchedText,
    primaryTranslation: row.primaryTranslation,
    partOfSpeech: row.partOfSpeech,
    sourceLabel: row.sourceType ? getSourceLabel(row.sourceType, row.sourceName) : null,
  };
}
