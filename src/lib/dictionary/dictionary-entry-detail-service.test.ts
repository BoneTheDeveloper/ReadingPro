import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupRawRow } from "./dictionary-lookup-repository";

const mocks = vi.hoisted(() => ({
  findEntryByIdRaw: vi.fn<() => Promise<LookupRawRow[]>>(),
}));

vi.mock("./dictionary-entry-detail-repository", () => ({
  findEntryByIdRaw: mocks.findEntryByIdRaw,
}));

import { getDictionaryEntryDetail } from "./dictionary-entry-detail-service";

const OPTIONS = {
  sourceLanguage: "en",
  targetLanguage: "vi",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRow(overrides: Partial<LookupRawRow> = {}): LookupRawRow {
  return {
    entryId: "e1",
    headword: "algorithm",
    sourceLanguage: "en",
    frequencyRank: 100,
    senseId: "s1",
    partOfSpeech: "noun",
    definition: "a step-by-step procedure",
    example: "sorting algorithm",
    tags: ["computer science"],
    usageRank: 1,
    translationId: "t1",
    translationSenseId: "s1",
    targetLanguage: "vi",
    translation: "thuật toán",
    isPrimary: true,
    rank: 1,
    confidence: 0.95,
    status: "reviewed",
    sourceType: "seed",
    sourceName: "reviewed",
    reviewedAt: null,
    ...overrides,
  };
}

describe("getDictionaryEntryDetail", () => {
  it("returns DictionaryEntryDto for valid entry", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([makeRow()]);

    const result = await getDictionaryEntryDetail("e1", OPTIONS);

    expect(result).toEqual(
      expect.objectContaining({
        id: "e1",
        headword: "algorithm",
        sourceLanguage: "en",
        frequencyRank: 100,
      }),
    );
    expect(result!.senses).toHaveLength(1);
  });

  it("returns null for missing entry", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([]);

    const result = await getDictionaryEntryDetail("nonexistent", OPTIONS);

    expect(result).toBeNull();
  });

  it("returns null on source-language mismatch (SQL filters by sourceLanguage)", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([]);

    const result = await getDictionaryEntryDetail("e1", {
      sourceLanguage: "fr",
      targetLanguage: "vi",
    });

    expect(result).toBeNull();
  });

  it("filters out senses with no runtime-status translations", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([
      makeRow({ senseId: "s1", usageRank: 1, translationId: "t1", status: "reviewed" }),
      makeRow({ senseId: "s2", usageRank: 2, translationId: "t2", status: "deprecated", definition: "only deprecated" }),
    ]);

    const result = await getDictionaryEntryDetail("e1", OPTIONS);

    expect(result!.senses).toHaveLength(1);
    expect(result!.senses[0].id).toBe("s1");
  });

  it("preserves senses in repository order", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([
      makeRow({ senseId: "s1", usageRank: 1 }),
      makeRow({ senseId: "s2", usageRank: 2, partOfSpeech: "verb", translation: "xử lý" }),
    ]);

    const result = await getDictionaryEntryDetail("e1", OPTIONS);

    expect(result!.senses[0].id).toBe("s1");
    expect(result!.senses[1].id).toBe("s2");
  });

  it("preserves translations in repository order", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([
      makeRow({ translationId: "t1", rank: 1, translation: "first" }),
      makeRow({ translationId: "t2", rank: 2, translation: "second", isPrimary: false }),
    ]);

    const result = await getDictionaryEntryDetail("e1", OPTIONS);

    const translations = result!.senses[0].translations;
    expect(translations[0].id).toBe("t1");
    expect(translations[1].id).toBe("t2");
  });

  it("sets sourceLabel via getSourceLabel on each translation", async () => {
    mocks.findEntryByIdRaw.mockResolvedValue([
      makeRow({ sourceType: "seed", sourceName: "reviewed" }),
    ]);

    const result = await getDictionaryEntryDetail("e1", OPTIONS);

    expect(result!.senses[0].translations[0].sourceLabel).toBe("Dictionary");
  });
});
