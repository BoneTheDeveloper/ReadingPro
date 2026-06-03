import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupRawRow } from "./lookup.repository";

const mocks = vi.hoisted(() => ({
  findDictionaryLookupEntry: vi.fn<() => Promise<LookupRawRow[]>>(),
}));

vi.mock("./lookup.repository", () => ({
  findDictionaryLookupEntry: mocks.findDictionaryLookupEntry,
  findQuickLookupTranslation: vi.fn(),
}));

import { resolveDictionaryLookup } from "./lookup.service";

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

describe("resolveDictionaryLookup", () => {
  it("returns DictionaryEntryDto on exact headword match", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([makeRow()]);

    const result = await resolveDictionaryLookup("algorithm", OPTIONS);

    expect(result).toEqual(
      expect.objectContaining({
        id: "e1",
        headword: "algorithm",
        sourceLanguage: "en",
        frequencyRank: 100,
      }),
    );
    expect("found" in result).toBe(false);
    if (!("senses" in result)) throw new Error("expected entry");
    expect(result.senses).toHaveLength(1);
  });

  it("returns DictionaryEntryDto on alias match", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([
      makeRow({ headword: "algorithm" }),
    ]);

    const result = await resolveDictionaryLookup("algo", OPTIONS);

    expect(result).toEqual(
      expect.objectContaining({
        id: "e1",
        headword: "algorithm",
      }),
    );
  });

  it("returns miss DTO when no match found", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([]);

    const result = await resolveDictionaryLookup("xyz", OPTIONS);

    expect(result).toEqual({ headword: "xyz", found: false });
  });

  it("normalizes input term before querying", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([makeRow()]);

    await resolveDictionaryLookup("  Algorithm  ", OPTIONS);

    expect(mocks.findDictionaryLookupEntry).toHaveBeenCalledWith("algorithm", "en", "vi");
  });

  it("calls findDictionaryLookupEntry once per lookup", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([makeRow()]);

    await resolveDictionaryLookup("algorithm", OPTIONS);

    expect(mocks.findDictionaryLookupEntry).toHaveBeenCalledOnce();
  });

  it("includes draft translations when includeDraft is true", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([
      makeRow({
        translationId: "t1",
        status: "reviewed",
        translation: "reviewed trans",
      }),
      makeRow({
        translationId: "t2",
        status: "draft",
        translation: "draft trans",
        isPrimary: false,
        rank: 2,
        sourceType: "llm",
        sourceName: null,
      }),
    ]);

    const result = await resolveDictionaryLookup("algorithm", {
      ...OPTIONS,
      includeDraft: true,
    });
    if (!("senses" in result)) throw new Error("expected entry");

    const translations = result.senses?.[0]?.translations ?? [];
    expect(translations).toHaveLength(2);
    expect(translations.find((t: { status: string }) => t.status === "draft")).toBeDefined();
  });

  it("excludes draft translations by default", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([
      makeRow({
        translationId: "t1",
        status: "reviewed",
        translation: "reviewed trans",
      }),
      makeRow({
        translationId: "t2",
        status: "draft",
        translation: "draft trans",
        isPrimary: false,
        rank: 2,
        sourceType: "llm",
        sourceName: null,
      }),
    ]);

    const result = await resolveDictionaryLookup("algorithm", OPTIONS);
    if (!("senses" in result)) throw new Error("expected entry");

    const translations = result.senses?.[0]?.translations ?? [];
    expect(translations).toHaveLength(1);
    expect(translations[0].status).toBe("reviewed");
  });

  it("preserves sense order from repository", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([
      makeRow({ senseId: "s1", usageRank: 1, translationId: "t1" }),
      makeRow({ senseId: "s2", usageRank: 2, translationId: "t3", partOfSpeech: "verb", translation: "xử lý" }),
    ]);

    const result = await resolveDictionaryLookup("algorithm", OPTIONS);
    if (!("senses" in result)) throw new Error("expected entry");

    expect(result.senses[0].id).toBe("s1");
    expect(result.senses[1].id).toBe("s2");
  });

  it("preserves translation order from repository", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([
      makeRow({ translationId: "t1", rank: 1, translation: "first" }),
      makeRow({ translationId: "t2", rank: 2, translation: "second", isPrimary: false }),
    ]);

    const result = await resolveDictionaryLookup("algorithm", OPTIONS);
    if (!("senses" in result)) throw new Error("expected entry");

    const translations = result.senses[0].translations;
    expect(translations[0].id).toBe("t1");
    expect(translations[1].id).toBe("t2");
  });

  it("filters out senses with no runtime-status translations", async () => {
    mocks.findDictionaryLookupEntry.mockResolvedValue([
      makeRow({ senseId: "s1", usageRank: 1, translationId: "t1", status: "reviewed" }),
      makeRow({ senseId: "s2", usageRank: 2, translationId: "t2", status: "deprecated", definition: "only deprecated" }),
    ]);

    const result = await resolveDictionaryLookup("algorithm", OPTIONS);
    if (!("senses" in result)) throw new Error("expected entry");

    expect(result.senses).toHaveLength(1);
    expect(result.senses[0].id).toBe("s1");
  });
});
