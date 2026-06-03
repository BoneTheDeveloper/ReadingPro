import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionaryLookup } from "@/app/api/dictionary/lookup/route";
import type { DictionaryEntryDto, DictionaryMissDto } from "@/lib/dictionary/shared/dictionary-dtos";
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

vi.mock("@/lib/dictionary/lookup/lookup.service", () => ({
  resolveDictionaryLookup: routeMocks.resolveDictionaryLookup,
}));

function createLookupRequest(query: string) {
  return new NextRequest(`https://english-reading.test/api/dictionary/lookup?${query}`);
}

const lookupResult: DictionaryEntryDto = {
  id: "entry-algorithm",
  headword: "algorithm",
  sourceLanguage: "en",
  frequencyRank: 100,
  senses: [{
    id: "sense-1",
    partOfSpeech: "noun",
    definition: "a set of rules",
    example: null,
    tags: [],
    usageRank: 0,
    translations: [{
      id: "trans-1",
      senseId: "sense-1",
      targetLanguage: "vi",
      translation: "thuat toan",
      isPrimary: true,
      rank: 1,
      confidence: null,
      status: "reviewed",
      sourceType: "seed",
      sourceName: null,
      reviewedAt: null,
      sourceLabel: "Dictionary",
    }],
  }],
};

const missResult: DictionaryMissDto = {
  headword: "xyznonexistent",
  found: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("GET /api/dictionary/lookup", () => {
  it("returns a found entry for a valid query", async () => {
    routeMocks.resolveDictionaryLookup.mockResolvedValue(lookupResult);

    const response = await dictionaryLookup(
      createLookupRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse<{ success: boolean; data: DictionaryEntryDto }>(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toMatchObject({ success: true, data: lookupResult });
    expect(routeMocks.resolveDictionaryLookup).toHaveBeenCalledWith("algorithm", {
      sourceLanguage: "en",
      targetLanguage: "vi",
      performanceStepPrefix: undefined,
    });
  });

  it("returns a miss when no entry matches", async () => {
    routeMocks.resolveDictionaryLookup.mockResolvedValue(missResult);

    const response = await dictionaryLookup(
      createLookupRequest("q=xyznonexistent&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await readJsonResponse<{ success: boolean; data: DictionaryMissDto }>(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toMatchObject({ success: true, data: missResult });
  });

  it("rejects empty query parameters before authentication", async () => {
    const response = await dictionaryLookup(
      createLookupRequest("q=&sourceLanguage=en&targetLanguage=vi"),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(await readJsonResponse(response), "Invalid query parameters.");
    expect(routeMocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(routeMocks.resolveDictionaryLookup).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionaryLookup(
      createLookupRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );

    expect(response.status).toBe(401);
    expectApiErrorPayload(await readJsonResponse(response), "Authentication required.");
  });
});
