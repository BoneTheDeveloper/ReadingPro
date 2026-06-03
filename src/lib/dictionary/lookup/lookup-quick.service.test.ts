import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveQuickDictionaryTranslation } from "./lookup-quick.service";

vi.mock("./lookup.service", () => ({
  resolveQuickDictionaryLookupSql: vi.fn(),
}));

import { resolveQuickDictionaryLookupSql } from "./lookup.service";

const mockLookup = vi.mocked(resolveQuickDictionaryLookupSql);

const INPUT = {
  sourceLanguage: "en",
  targetLanguage: "vi",
} as const;

beforeEach(() => {
  mockLookup.mockReset();
});

describe("resolveQuickDictionaryTranslation", () => {
  it("returns dictionary result when lookup finds a translation", async () => {
    mockLookup.mockResolvedValue({
      id: "t1",
      senseId: "s1",
      targetLanguage: "vi",
      translation: "thiên lệch thuật toán",
      isPrimary: true,
      rank: 1,
      confidence: 0.95,
      status: "reviewed",
      sourceType: "seed",
      sourceName: "reviewed",
      reviewedAt: null,
      sourceLabel: "Dictionary",
    });

    const result = await resolveQuickDictionaryTranslation({
      text: "algorithmic bias",
      context: "Algorithmic bias is a concern.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "thiên lệch thuật toán",
      type: null,
      provider: "dictionary",
    });
  });

  it("returns fallback when lookup finds nothing", async () => {
    mockLookup.mockResolvedValue(null);

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

  it("normalizes the input text before lookup", async () => {
    mockLookup.mockResolvedValue({
      id: "t1",
      senseId: "s1",
      targetLanguage: "vi",
      translation: "thuật toán",
      isPrimary: true,
      rank: 1,
      confidence: 0.95,
      status: "reviewed",
      sourceType: "seed",
      sourceName: "reviewed",
      reviewedAt: null,
      sourceLabel: "Dictionary",
    });

    await resolveQuickDictionaryTranslation({
      text: "  Algorithm  ",
      context: "The algorithm works.",
      ...INPUT,
    });

    expect(mockLookup).toHaveBeenCalledWith("algorithm", expect.any(Object));
  });

  it("returns fallback with normalized text for unknown word", async () => {
    mockLookup.mockResolvedValue(null);

    const result = await resolveQuickDictionaryTranslation({
      text: "  Unknown  ",
      context: "The unknown word.",
      ...INPUT,
    });

    expect(result).toEqual({
      translation: "unknown",
      type: null,
      provider: "fallback",
    });
  });
});
