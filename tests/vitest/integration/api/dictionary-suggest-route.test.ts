import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionarySuggest } from "@/app/api/dictionary/suggest/route";
import type { DictionarySuggestItemDto } from "@/lib/dictionary/shared/dictionary-dtos";
import { userProfileFixture } from "../../fixtures";
import { readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  suggestDictionaryTerms: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/lib/dictionary/suggest/suggest.service", () => ({
  suggestDictionaryTerms: routeMocks.suggestDictionaryTerms,
}));

function createSuggestRequest(query: string) {
  return new NextRequest(`https://english-reading.test/api/dictionary/suggest?${query}`);
}

const suggestItems: DictionarySuggestItemDto[] = [
  {
    id: "entry-algorithm",
    headword: "algorithm",
    matchType: "exact",
    matchedAlias: null,
    primaryTranslation: "thuat toan",
    sourceLabel: "Dictionary",
  },
  {
    id: "entry-algorithms",
    headword: "algorithms",
    matchType: "prefix",
    matchedAlias: null,
    primaryTranslation: "cac thuat toan",
    sourceLabel: "Dictionary",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("GET /api/dictionary/suggest", () => {
  it("returns suggest results for the authenticated user", async () => {
    routeMocks.suggestDictionaryTerms.mockResolvedValue(suggestItems);

    const response = await dictionarySuggest(
      createSuggestRequest("q=algo&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse<{ success: boolean; data: DictionarySuggestItemDto[] }>(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toMatchObject({ success: true, data: suggestItems });
    expect(routeMocks.suggestDictionaryTerms).toHaveBeenCalledWith("algo", {
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
  });

  it("returns empty array for short queries after authentication", async () => {
    const response = await dictionarySuggest(
      createSuggestRequest("q=a&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse<{ success: boolean; data: unknown[] }>(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data).toEqual([]);
    expect(routeMocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(routeMocks.suggestDictionaryTerms).not.toHaveBeenCalled();
  });

  it("rejects invalid query parameters before authentication", async () => {
    const response = await dictionarySuggest(
      createSuggestRequest("q=&sourceLanguage=en&targetLanguage=vi"),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(await readJsonResponse(response), "Invalid query parameters.");
    expect(routeMocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(routeMocks.suggestDictionaryTerms).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionarySuggest(
      createSuggestRequest("q=algo&sourceLanguage=en&targetLanguage=vi"),
    );

    expect(response.status).toBe(401);
    expectApiErrorPayload(await readJsonResponse(response), "Authentication required.");
  });
});
