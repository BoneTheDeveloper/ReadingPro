import { createModuleLogger } from "@/lib/core/logger";
import { fetchDictionaryEntriesByTerms } from "@/lib/db/dictionary-queries";
import { normalizeDictionaryTerm } from "@/lib/db/translation-queries";

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

type RankedEntry = {
  normalizedTerm: string;
  translation: string;
  type: string | null;
  confidence: number;
  rank: number;
};

/**
 * Resolve a quick translation using contextual dictionary lookup, ranked
 * candidate selection, and deterministic fallback. No AI calls.
 *
 * Ranking priority:
 *   1. Contextual phrase containing the selected text as a subterm
 *   2. Exact selected-text match (high confidence)
 *   3. Composed token translations
 *   4. Deterministic fallback (joined tokens or normalized text)
 */
export async function resolveQuickDictionaryTranslation(
  input: QuickResolverInput,
): Promise<QuickDictionaryResult> {
  const normalizedText = normalizeDictionaryTerm(input.text);
  const normalizedContext = normalizeDictionaryTerm(input.context);

  const candidateTerms = buildCandidateTerms(normalizedText, normalizedContext);

  const entries = await fetchDictionaryEntriesByTerms({
    terms: candidateTerms,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  log.debug(
    {
      context: {
        candidateCount: candidateTerms.length,
        entryCount: entries.length,
        selectedTextLength: normalizedText.length,
        contextLength: normalizedContext.length,
      },
    },
    "Dictionary candidate lookup completed",
  );

  const ranked = rankEntries(entries, normalizedText, normalizedContext);

  if (ranked) {
    log.debug(
      {
        context: {
          provider: "dictionary",
          matchedTerm: ranked.normalizedTerm,
          rank: ranked.rank,
        },
      },
      "Dictionary translation resolved",
    );
    return {
      translation: ranked.translation,
      type: ranked.type,
      provider: "dictionary",
    };
  }

  return deterministicFallback(normalizedText, entries);
}

function stripPunctuation(word: string): string {
  return word.replace(/^[^\w']+|[^\w']+$/g, "");
}

function buildCandidateTerms(normalizedText: string, normalizedContext: string): string[] {
  const terms = new Set<string>();
  const textTokens = normalizedText.split(" ");

  // 1. Exact selected text
  terms.add(normalizedText);

  // 2. Contextual n-grams that include the selected text or its tokens
  // Strip surrounding punctuation from context words so "bias." matches "bias"
  const rawContextWords = normalizedContext.split(/\s+/);
  const contextWords = rawContextWords.map(stripPunctuation);
  const strippedTextTokens = textTokens.map(stripPunctuation);

  for (const token of strippedTextTokens) {
    addNgramsContainingWord(contextWords, token, terms);
  }

  // 3. Individual tokens of the selected text
  for (const token of textTokens) {
    if (token.length > 1) terms.add(token);
  }

  return [...terms];
}

function addNgramsContainingWord(
  words: string[],
  targetWord: string,
  out: Set<string>,
) {
  const indices: number[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === targetWord) indices.push(i);
  }

  for (const idx of indices) {
    // Generate n-grams of size 2-4 around the target word
    for (let size = 2; size <= 4; size++) {
      for (let start = Math.max(0, idx - size + 1); start <= Math.min(idx, words.length - size); start++) {
        const ngram = words.slice(start, start + size).join(" ");
        out.add(ngram);
      }
    }
  }
}

function rankEntries(
  entries: Array<{ normalizedTerm: string; translation: string; type: string | null; confidence: number }>,
  normalizedText: string,
  normalizedContext: string,
): RankedEntry | null {
  if (entries.length === 0) return null;

  const ranked: RankedEntry[] = [];
  const selectedTokens = normalizedText.split(" ");

  for (const entry of entries) {
    const entryTerm = entry.normalizedTerm;
    const entryTokens = entryTerm.split(" ");
    const isPhrase = entryTokens.length > 1;
    const containsSelected = entryTerm !== normalizedText
      && selectedTokens.every(t => entryTokens.includes(t));
    const isInContext = normalizedContext.includes(entryTerm);
    const isExactMatch = entryTerm === normalizedText;

    let rank: number;
    if (isPhrase && containsSelected && isInContext) {
      // Contextual phrase containing selection — highest priority
      rank = 1;
    } else if (isExactMatch && entry.confidence >= 0.8) {
      // High-confidence exact match
      rank = 2;
    } else if (isPhrase && isInContext) {
      // Contextual phrase (doesn't necessarily contain selected text)
      rank = 3;
    } else if (isExactMatch) {
      // Lower-confidence exact match
      rank = 4;
    } else {
      // Token-level match — not returned as dictionary result;
      // used by deterministic fallback instead.
      continue;
    }

    ranked.push({
      normalizedTerm: entryTerm,
      translation: entry.translation,
      type: entry.type,
      confidence: entry.confidence,
      rank,
    });
  }

  ranked.sort((a, b) => a.rank - b.rank || b.confidence - a.confidence);

  return ranked[0];
}

function deterministicFallback(
  normalizedText: string,
  entries: Array<{ normalizedTerm: string; translation: string; type: string | null }>,
): QuickDictionaryResult {
  // If token-level entries exist, join their translations in source order
  const tokens = normalizedText.split(" ");
  const tokenTranslations: string[] = [];
  const entryMap = new Map(entries.map((e) => [e.normalizedTerm, e]));

  for (const token of tokens) {
    const entry = entryMap.get(token);
    if (entry) {
      tokenTranslations.push(entry.translation);
    }
  }

  if (tokenTranslations.length > 0) {
    log.debug(
      { context: { provider: "fallback", tokenCount: tokenTranslations.length } },
      "Deterministic fallback using token translations",
    );
    return {
      translation: tokenTranslations.join(" "),
      type: null,
      provider: "fallback",
    };
  }

  log.debug(
    { context: { provider: "fallback" } },
    "Deterministic fallback returning normalized text",
  );
  return {
    translation: normalizedText,
    type: null,
    provider: "fallback",
  };
}
