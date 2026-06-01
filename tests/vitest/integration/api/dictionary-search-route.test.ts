import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionarySearch } from "@/app/api/dictionary/search/route";
import type { DictionaryEntryDto } from "@/lib/dictionary/dictionary-dtos";
import { userProfileFixture } from "../../fixtures";
import { readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  resolveDictionaryLookup: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/lib/dictionary/resolve-dictionary-lookup", () => ({
  resolveDictionaryLookup: routeMocks.resolveDictionaryLookup,
}));

function createSearchRequest(query: string) {
  return new NextRequest(`https://english-reading.test/api/dictionary/search?${query}`);
}

const dictionaryEntry: DictionaryEntryDto = {
  id: "dict-algorithm",
  headword: "algorithm",
  sourceLanguage: "en",
  frequencyRank: 10,
  senses: [
    {
      id: "sense-algorithm",
      partOfSpeech: "noun",
      definition: "A repeatable process for solving a problem.",
      example: "The algorithm sorts the words.",
      tags: [],
      usageRank: 1,
      translations: [
        {
          id: "translation-algorithm",
          senseId: "sense-algorithm",
          targetLanguage: "vi",
          translation: "thuat toan",
          isPrimary: true,
          rank: 1,
          confidence: null,
          status: "reviewed",
          sourceType: "seed",
          sourceName: "reviewed",
          reviewedAt: null,
          sourceLabel: "Dictionary",
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("GET /api/dictionary/search", () => {
  it("returns dictionary lookup data for the authenticated user", async () => {
    routeMocks.resolveDictionaryLookup.mockResolvedValue(dictionaryEntry);

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toMatchObject({ success: true, data: dictionaryEntry });
    expect(routeMocks.resolveDictionaryLookup).toHaveBeenCalledWith("algorithm", {
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
  });

  it("rejects invalid query parameters before authentication", async () => {
    const response = await dictionarySearch(
      createSearchRequest("q=&sourceLanguage=en&targetLanguage=vi"),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(await readJsonResponse(response), "Invalid query parameters.");
    expect(routeMocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(routeMocks.resolveDictionaryLookup).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );

    expect(response.status).toBe(401);
    expectApiErrorPayload(await readJsonResponse(response), "Authentication required.");
  });
});
