import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { findEntryByAliasTerm } from "./dictionary-queries";

const mockFindFirst = vi.mocked(db.dictionaryAlias.findFirst);

beforeEach(() => {
  mockFindFirst.mockReset();
});

describe("dictionary query helpers", () => {
  it("filters alias lookup by source language without invalid include relation filters", async () => {
    const entry = {
      id: "dict-algorithm",
      headword: "algorithm",
      normalizedHeadword: "algorithm",
      sourceLanguage: "en",
      senses: [],
      aliases: [],
    };
    mockFindFirst.mockResolvedValue({ entry } as never);

    await expect(findEntryByAliasTerm("algo", "en")).resolves.toBe(entry);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          normalizedAlias: "algo",
          entry: { sourceLanguage: "en" },
        },
        include: expect.objectContaining({
          entry: expect.not.objectContaining({
            where: expect.anything(),
          }),
        }),
      }),
    );
  });
});
