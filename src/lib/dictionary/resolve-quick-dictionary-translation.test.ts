import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveQuickDictionaryTranslation } from "./resolve-quick-dictionary-translation";

vi.mock("@/lib/db/dictionary-queries", () => ({
  fetchDictionaryEntriesByTerms: vi.fn(),
}));

vi.mock("@/lib/db/translation-queries", () => ({
  normalizeDictionaryTerm: (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim(),
}));

import { fetchDictionaryEntriesByTerms } from "@/lib/db/dictionary-queries";

const mockFetch = vi.mocked(fetchDictionaryEntriesByTerms);

const INPUT = {
  sourceLanguage: "en",
  targetLanguage: "vi",
} as const;

function entry(term: string, translation: string, type = "word", confidence = 0.95) {
  return {
    normalizedTerm: term,
    translation,
    type,
    confidence,
    id: `id-${term}`,
    sourceLanguage: "en",
    targetLanguage: "vi",
    pronunciation: null,
    meanings: null,
    examples: null,
    relatedWords: null,
    source: "seed:test",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("resolveQuickDictionaryTranslation", () => {
  it("returns exact phrase match for 'algorithmic bias'", async () => {
    mockFetch.mockResolvedValue([
      entry("algorithmic bias", "thiên lệch thuật toán", "noun phrase", 0.95),
      entry("bias", "thiên lệch", "noun", 0.95),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "algorithmic bias",
      context: "Algorithmic bias is a major concern in AI systems.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "thiên lệch thuật toán",
      type: "noun phrase",
      provider: "dictionary",
    });
  });

  it("returns contextual phrase when selection is a subterm inside a phrase in context", async () => {
    mockFetch.mockResolvedValue([
      entry("algorithmic bias", "thiên lệch thuật toán", "noun phrase", 0.95),
      entry("bias", "thiên lệch", "noun", 0.95),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "bias",
      context: "Algorithmic bias is a major concern in AI systems.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "thiên lệch thuật toán",
      type: "noun phrase",
      provider: "dictionary",
    });
  });

  it("returns exact single-word match for standalone word", async () => {
    mockFetch.mockResolvedValue([
      entry("algorithm", "thuật toán", "noun", 0.95),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "algorithm",
      context: "The algorithm processes natural language input.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "thuật toán",
      type: "noun",
      provider: "dictionary",
    });
  });

  it("returns deterministic fallback joining token translations for unknown phrase", async () => {
    mockFetch.mockResolvedValue([
      entry("quorvex", "quorvex", "word", 0.6),
      entry("drift", "sự trôi", "noun", 0.95),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "quorvex drift",
      context: "The quorvex drift was measured.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "quorvex sự trôi",
      type: null,
      provider: "fallback",
    });
  });

  it("returns normalized text as fallback when no token entries exist", async () => {
    mockFetch.mockResolvedValue([]);

    const result = await resolveQuickDictionaryTranslation({
      text: "xyzzy plugh",
      context: "The xyzzy plugh mechanism failed.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "xyzzy plugh",
      type: null,
      provider: "fallback",
    });
  });

  it("does not false-positive match 'as' inside 'was found' (substring bug)", async () => {
    mockFetch.mockResolvedValue([
      entry("was found", "được tìm thấy", "verb phrase", 0.9),
      entry("as", "như", "conjunction", 0.8),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "as",
      context: "It was found as expected.",
      ...INPUT,
    });

    // Should get the exact match "as" → "như", not the phrase "was found"
    expect(result.translation).toBe("như");
    expect(result.provider).toBe("dictionary");
  });

  it("prefers contextual phrase over generic single-word match", async () => {
    mockFetch.mockResolvedValue([
      entry("natural language processing", "xử lý ngôn ngữ tự nhiên", "noun phrase", 0.95),
      entry("language", "ngôn ngữ", "noun", 0.95),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "language",
      context: "Natural language processing has advanced rapidly.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "xử lý ngôn ngữ tự nhiên",
      type: "noun phrase",
      provider: "dictionary",
    });
  });

  it("returns single-word match when no contextual phrase exists", async () => {
    mockFetch.mockResolvedValue([
      entry("bias", "thiên lệch", "noun", 0.95),
    ]);

    const result = await resolveQuickDictionaryTranslation({
      text: "bias",
      context: "The statistical bias was corrected.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "thiên lệch",
      type: "noun",
      provider: "dictionary",
    });
  });
});
