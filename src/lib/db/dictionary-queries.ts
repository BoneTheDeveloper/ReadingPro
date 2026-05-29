import { db } from "./client";
import { normalizeDictionaryTerm } from "./translation-queries";

interface DictionarySearchParams {
  term: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface DictionaryListParams {
  sourceLanguage: string;
  targetLanguage: string;
  limit?: number;
  offset?: number;
}

export async function searchDictionaryExact(input: DictionarySearchParams) {
  const normalizedTerm = normalizeDictionaryTerm(input.term);

  return db.dictionaryEntry.findFirst({
    where: {
      normalizedTerm,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    },
  });
}

export async function suggestDictionaryEntries(input: {
  term: string;
  sourceLanguage: string;
  targetLanguage: string;
  limit?: number;
}) {
  const { sourceLanguage, targetLanguage, limit = 8 } = input;
  const normalizedTerm = normalizeDictionaryTerm(input.term);

  return db.dictionaryEntry.findMany({
    where: {
      normalizedTerm: { startsWith: normalizedTerm },
      sourceLanguage,
      targetLanguage,
    },
    orderBy: [{ normalizedTerm: "asc" }],
    take: limit,
    select: {
      id: true,
      normalizedTerm: true,
      translation: true,
      type: true,
      confidence: true,
    },
  });
}

export async function fetchDictionaryEntriesByTerms(input: {
  terms: string[];
  sourceLanguage: string;
  targetLanguage: string;
}) {
  const normalizedTerms = input.terms.map(normalizeDictionaryTerm);
  const uniqueTerms = [...new Set(normalizedTerms)];

  if (uniqueTerms.length === 0) return [];

  return db.dictionaryEntry.findMany({
    where: {
      normalizedTerm: { in: uniqueTerms },
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    },
  });
}

export async function listDictionaryEntries(input: DictionaryListParams) {
  const { sourceLanguage, targetLanguage, limit = 50, offset = 0 } = input;

  const [entries, total] = await Promise.all([
    db.dictionaryEntry.findMany({
      where: { sourceLanguage, targetLanguage },
      orderBy: { normalizedTerm: "asc" },
      take: limit,
      skip: offset,
    }),
    db.dictionaryEntry.count({
      where: { sourceLanguage, targetLanguage },
    }),
  ]);

  return { entries, total, limit, offset };
}
