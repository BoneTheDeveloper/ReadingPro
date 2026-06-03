import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchDictionary } from "./dictionary-search-service";

const mocks = vi.hoisted(() => ({
  searchDictionaryCandidates: vi.fn(),
}));

vi.mock("./dictionary-search-repository", () => ({
  searchDictionaryCandidates: mocks.searchDictionaryCandidates,
}));

describe("searchDictionary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty results for normalized short queries without searching", async () => {
    await expect(searchDictionary(" a ", {
      sourceLanguage: "en",
      targetLanguage: "vi",
    })).resolves.toEqual([]);

    expect(mocks.searchDictionaryCandidates).not.toHaveBeenCalled();
  });

  it("normalizes the query and formats candidate rows as search DTOs", async () => {
    mocks.searchDictionaryCandidates.mockResolvedValue([{
      id: "entry-1",
      headword: "algorithm",
      matchType: "exact",
      matchedText: null,
      primaryTranslation: "thuat toan",
      partOfSpeech: "noun",
      sourceType: "seed",
      sourceName: "reviewed",
    }]);

    await expect(searchDictionary("  Algorithm  ", {
      sourceLanguage: "en",
      targetLanguage: "vi",
      limit: 5,
    })).resolves.toEqual([{
      id: "entry-1",
      headword: "algorithm",
      matchType: "exact",
      matchedText: null,
      primaryTranslation: "thuat toan",
      partOfSpeech: "noun",
      sourceLabel: "Dictionary",
    }]);

    expect(mocks.searchDictionaryCandidates).toHaveBeenCalledWith({
      normalizedQuery: "algorithm",
      sourceLanguage: "en",
      targetLanguage: "vi",
      limit: 5,
    });
  });
});
