import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionarySearch } from "@/app/api/dictionary/search/route";
import type { DictionarySearchResultDto } from "@/lib/dictionary/shared/dictionary-dtos";
import { userProfileFixture } from "../../fixtures";
import { readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  searchDictionary: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/lib/dictionary/search/search.service", () => ({
  searchDictionary: routeMocks.searchDictionary,
}));

function createSearchRequest(query: string) {
  return new NextRequest(`https://english-reading.test/api/dictionary/search?${query}`);
}

const searchResult: DictionarySearchResultDto = {
  id: "dict-algorithm",
  headword: "algorithm",
  matchType: "exact",
  matchedText: null,
  primaryTranslation: "thuat toan",
  partOfSpeech: "noun",
  sourceLabel: "Dictionary",
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("GET /api/dictionary/search", () => {
  it("returns search results for the authenticated user", async () => {
    routeMocks.searchDictionary.mockResolvedValue([searchResult]);

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse<{ success: boolean; data: DictionarySearchResultDto[] }>(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toMatchObject({ success: true, data: [searchResult] });
    expect(routeMocks.searchDictionary).toHaveBeenCalledWith("algorithm", {
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
  });

  it("delegates short query handling to the service after authentication", async () => {
    routeMocks.searchDictionary.mockResolvedValue([]);

    const response = await dictionarySearch(
      createSearchRequest("q=a&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse<{ success: boolean; data: unknown[] }>(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data).toEqual([]);
    expect(routeMocks.getAuthenticatedUser).toHaveBeenCalled();
    expect(routeMocks.searchDictionary).toHaveBeenCalledWith("a", {
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
    expect(routeMocks.searchDictionary).not.toHaveBeenCalled();
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
