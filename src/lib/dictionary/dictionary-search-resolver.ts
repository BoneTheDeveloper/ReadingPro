import { normalizeDictionaryTerm } from "./normalize-dictionary-term";
import { getSourceLabel, type DictionarySearchResultDto } from "./dictionary-dtos";
import {
  findEntryByHeadword,
  findEntryByAliasTerm,
  findEntriesByHeadwordPrefix,
  findEntriesByAliasPrefix,
  findEntriesContaining,
} from "@/lib/db/dictionary-queries";

export interface SearchOptions {
  sourceLanguage: string;
  targetLanguage: string;
  performanceStepPrefix?: string;
}

type MatchRank = 0 | 1 | 2 | 3 | 4;

const MATCH_RANK: Record<string, MatchRank> = {
  exact: 0,
  alias: 1,
  phrase: 2,
  prefix: 3,
  contains: 4,
};

type CandidateEntry = {
  id: string;
  headword: string;
  normalizedHeadword: string;
  senses?: Array<{
    partOfSpeech: string | null;
    translations?: Array<{
      translation: string;
      sourceType: string;
      sourceName: string | null;
    }>;
  }>;
  matchedAlias?: string;
};

export async function resolveDictionarySearch(
  query: string,
  options: SearchOptions,
): Promise<DictionarySearchResultDto[]> {
  const normalized = normalizeDictionaryTerm(query);
  if (normalized.length < 2) return [];

  const [exactHeadword, exactAlias, prefixHeadword, prefixAlias, containsResults] = await Promise.all([
    findEntryByHeadword(normalized, options.sourceLanguage),
    findEntryByAliasTerm(normalized, options.sourceLanguage),
    findEntriesByHeadwordPrefix(query, options.sourceLanguage),
    findEntriesByAliasPrefix(query, options.sourceLanguage),
    resolveContains(normalized, options.sourceLanguage),
  ]);

  const candidates = new Map<string, { entry: CandidateEntry; matchType: string; matchedText: string | null }>();

  function upsert(entry: CandidateEntry, matchType: string, matchedText: string | null) {
    const existing = candidates.get(entry.id);
    const newRank = MATCH_RANK[matchType] ?? 4;
    if (!existing || newRank < (MATCH_RANK[existing.matchType] ?? 4)) {
      candidates.set(entry.id, { entry, matchType, matchedText });
    }
  }

  if (exactHeadword) upsert(exactHeadword, "exact", null);
  if (exactAlias) upsert(exactAlias, "alias", exactAlias.headword !== normalized ? normalized : null);

  for (const entry of prefixHeadword) {
    const mt = entry.normalizedHeadword === normalized ? "exact" : "prefix";
    upsert(entry, mt, null);
  }

  for (const entry of prefixAlias) {
    const matchedAlias = "matchedAlias" in entry ? (entry as CandidateEntry & { matchedAlias: string }).matchedAlias : null;
    const mt = matchedAlias === normalized ? "alias" : "prefix";
    upsert(entry, mt, matchedAlias ?? null);
  }

  for (const entry of containsResults) {
    upsert(entry, "contains", null);
  }

  const results: DictionarySearchResultDto[] = [];
  for (const { entry, matchType, matchedText } of candidates.values()) {
    const { primaryTranslation, partOfSpeech, sourceLabel } = extractSearchResultFields(entry);
    results.push({
      id: entry.id,
      headword: entry.headword,
      matchType: matchType as DictionarySearchResultDto["matchType"],
      matchedText,
      primaryTranslation,
      partOfSpeech,
      sourceLabel,
    });
  }

  results.sort((a, b) => (MATCH_RANK[a.matchType] ?? 4) - (MATCH_RANK[b.matchType] ?? 4));
  return results;
}

async function resolveContains(normalized: string, sourceLanguage: string) {
  const excludeIds: string[] = [];
  return findEntriesContaining(normalized, sourceLanguage, 8, excludeIds);
}

function extractSearchResultFields(entry: CandidateEntry) {
  const sense = entry.senses?.[0];
  const translation = sense?.translations?.[0];
  return {
    primaryTranslation: translation?.translation ?? null,
    partOfSpeech: sense?.partOfSpeech ?? null,
    sourceLabel: translation ? getSourceLabel(translation.sourceType, translation.sourceName) : null,
  };
}
