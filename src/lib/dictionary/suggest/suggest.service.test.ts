import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SuggestCandidateRow } from "./suggest.repository";

const mocks = vi.hoisted(() => ({
  findSuggestCandidates: vi.fn<() => Promise<SuggestCandidateRow[]>>(),
}));

vi.mock("./suggest.repository", () => ({
  findSuggestCandidates: mocks.findSuggestCandidates,
}));

import { suggestDictionaryTerms } from "./suggest.service";

const OPTIONS = { sourceLanguage: "en", targetLanguage: "vi" } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeHeadwordRow(overrides: Partial<SuggestCandidateRow> = {}): SuggestCandidateRow {
  return {
    id: "e1",
    headword: "algorithm",
    normalizedHeadword: "algorithm",
    frequencyRank: 100,
    matchType: "exact",
    matchedAlias: null,
    aliasType: null,
    primaryTranslation: "thuật toán",
    ...overrides,
  };
}

function makeAliasRow(overrides: Partial<SuggestCandidateRow> = {}): SuggestCandidateRow {
  return {
    id: "e2",
    headword: "algorithm",
    normalizedHeadword: "algorithm",
    frequencyRank: 100,
    matchType: "alias",
    matchedAlias: "algo",
    aliasType: "variant",
    primaryTranslation: "thuật toán",
    ...overrides,
  };
}

describe("suggestDictionaryTerms", () => {
  it("returns [] for short normalized query without querying repository", async () => {
    const result = await suggestDictionaryTerms(" a ", OPTIONS);

    expect(result).toEqual([]);
    expect(mocks.findSuggestCandidates).not.toHaveBeenCalled();
  });

  it("returns [] for single character query", async () => {
    const result = await suggestDictionaryTerms("a", OPTIONS);

    expect(result).toEqual([]);
    expect(mocks.findSuggestCandidates).not.toHaveBeenCalled();
  });

  it("maps row with exact matchType", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeHeadwordRow({ matchType: "exact" }),
    ]);

    const result = await suggestDictionaryTerms("algorithm", OPTIONS);

    expect(result).toHaveLength(1);
    expect(result[0].matchType).toBe("exact");
    expect(result[0].matchedAlias).toBeNull();
  });

  it("maps row with prefix matchType", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeHeadwordRow({ matchType: "prefix" }),
    ]);

    const result = await suggestDictionaryTerms("algorithm", OPTIONS);

    expect(result).toHaveLength(1);
    expect(result[0].matchType).toBe("prefix");
  });

  it("sets sourceLabel to Dictionary for headword row with primary translation", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeHeadwordRow({ primaryTranslation: "thuật toán" }),
    ]);

    const result = await suggestDictionaryTerms("algorithm", OPTIONS);

    expect(result[0].sourceLabel).toBe("Dictionary");
  });

  it("sets sourceLabel to null for headword row without primary translation", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeHeadwordRow({ primaryTranslation: null }),
    ]);

    const result = await suggestDictionaryTerms("algorithm", OPTIONS);

    expect(result[0].sourceLabel).toBeNull();
  });

  it("maps alias row with alias matchType", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeAliasRow({ matchType: "alias", matchedAlias: "algo" }),
    ]);

    const result = await suggestDictionaryTerms("algo", OPTIONS);

    expect(result).toHaveLength(1);
    expect(result[0].matchType).toBe("alias");
    expect(result[0].matchedAlias).toBe("algo");
  });

  it("maps alias row with prefix matchType when partial alias match", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeAliasRow({ matchType: "prefix", matchedAlias: "algorithmically" }),
    ]);

    const result = await suggestDictionaryTerms("algo", OPTIONS);

    expect(result).toHaveLength(1);
    expect(result[0].matchType).toBe("prefix");
  });

  it("derives alias sourceLabel from aliasType via getSourceLabel", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeAliasRow({ aliasType: "variant" }),
    ]);

    const result = await suggestDictionaryTerms("algo", OPTIONS);

    expect(result[0].sourceLabel).toBe("variant");
  });

  it("returns rows in repository order (dedup/rank done in SQL)", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeAliasRow({ id: "alias-1", matchType: "alias" }),
      makeHeadwordRow({ id: "prefix-1", matchType: "prefix" }),
    ]);

    const result = await suggestDictionaryTerms("algo", OPTIONS);

    expect(result[0].id).toBe("alias-1");
    expect(result[0].matchType).toBe("alias");
    expect(result[1].id).toBe("prefix-1");
    expect(result[1].matchType).toBe("prefix");
  });

  it("extracts primaryTranslation from row", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeHeadwordRow({ primaryTranslation: "thuật toán" }),
    ]);

    const result = await suggestDictionaryTerms("algorithm", OPTIONS);

    expect(result[0].primaryTranslation).toBe("thuật toán");
  });

  it("sets primaryTranslation to null when row has no translation", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([
      makeHeadwordRow({ primaryTranslation: null }),
    ]);

    const result = await suggestDictionaryTerms("algorithm", OPTIONS);

    expect(result[0].primaryTranslation).toBeNull();
  });

  it("calls findSuggestCandidates with normalized query, sourceLanguage", async () => {
    mocks.findSuggestCandidates.mockResolvedValue([]);

    await suggestDictionaryTerms("algo", OPTIONS);

    expect(mocks.findSuggestCandidates).toHaveBeenCalledWith("algo", "en");
  });
});
