import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionarySearch } from "@/app/api/dictionary/search/route";
import {
  dictionarySearchPerformanceResponseSchema,
  dictionarySearchResponseSchema,
  dictionarySearchSuccessResponseSchema,
} from "@/lib/dictionary/shared/dictionary-response-schema";
import type { DictionarySearchResultDto } from "@/lib/dictionary/shared/dictionary-dtos";
import { userProfileFixture } from "../../fixtures";
import { parseJsonResponse } from "../../helpers/api";
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

function createSearchRequest(query: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`https://english-reading.test/api/dictionary/search?${query}`, init);
}

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await parseJsonResponse(response, dictionarySearchResponseSchema), message);
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
    const payload = await parseJsonResponse(response, dictionarySearchSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: [searchResult] });
    expect(routeMocks.searchDictionary).toHaveBeenCalledWith("algorithm", {
      sourceLanguage: "en",
      targetLanguage: "vi",
      limit: 8,
    });
  });

  it("delegates short query handling to the service after authentication", async () => {
    routeMocks.searchDictionary.mockResolvedValue([]);

    const response = await dictionarySearch(
      createSearchRequest("q=a&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await parseJsonResponse(response, dictionarySearchSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data).toEqual([]);
    expect(routeMocks.getAuthenticatedUser).toHaveBeenCalled();
    expect(routeMocks.searchDictionary).toHaveBeenCalledWith("a", {
      sourceLanguage: "en",
      targetLanguage: "vi",
      limit: 8,
    });
  });

  it("honors an explicit search result limit", async () => {
    routeMocks.searchDictionary.mockResolvedValue([searchResult]);

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi&limit=5"),
    );
    const payload = await parseJsonResponse(response, dictionarySearchSuccessResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, data: [searchResult] });
    expect(routeMocks.searchDictionary).toHaveBeenCalledWith("algorithm", {
      sourceLanguage: "en",
      targetLanguage: "vi",
      limit: 5,
    });
  });

  it("returns explicit performance diagnostics when requested", async () => {
    routeMocks.searchDictionary.mockResolvedValue([searchResult]);

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi", {
        headers: { "x-dictionary-perf-metrics": "1" },
      }),
    );
    const payload = await parseJsonResponse(response, dictionarySearchPerformanceResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: [searchResult],
      performance: {
        queryLength: 9,
        normalizedQueryLength: 9,
        phase: "search",
        timings: {
          totalMs: expect.any(Number),
          steps: expect.objectContaining({
            auth: expect.any(Number),
            searchResolve: expect.any(Number),
          }),
        },
      },
    });
  });

  it("rejects invalid query parameters before authentication", async () => {
    const response = await dictionarySearch(
      createSearchRequest("q=&sourceLanguage=en&targetLanguage=vi"),
    );

    await expectJsonError(response, 400, "Invalid query parameters.");
    expect(routeMocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(routeMocks.searchDictionary).not.toHaveBeenCalled();
  });

  it("rejects invalid limits before authentication", async () => {
    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi&limit=500"),
    );

    await expectJsonError(response, 400, "Invalid query parameters.");
    expect(routeMocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(routeMocks.searchDictionary).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );

    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns a stable 500 error when search resolution fails", async () => {
    routeMocks.searchDictionary.mockRejectedValue(new Error("db down"));

    const response = await dictionarySearch(
      createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );

    await expectJsonError(response, 500, "Dictionary search failed.");
  });
});
