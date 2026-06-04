import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionaryEntryDetail } from "@/app/api/dictionary/entries/[entryId]/route";
import type { DictionaryEntryDto } from "@/lib/dictionary/shared/dictionary-dtos";
import { userProfileFixture } from "../../fixtures/user";
import { readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getDictionaryEntryDetail: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/lib/dictionary/entry-detail/entry-detail.service", () => ({
  getDictionaryEntryDetail: routeMocks.getDictionaryEntryDetail,
}));

function createEntryDetailRequest(entryId: string, query: string) {
  return new NextRequest(
    `https://english-reading.test/api/dictionary/entries/${entryId}?${query}`,
  );
}

function createParams(entryId: string) {
  return { params: Promise.resolve({ entryId }) };
}

const ENTRY_UUID = "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f";
const MISSING_UUID = "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a";

const dictionaryEntry: DictionaryEntryDto = {
  id: ENTRY_UUID,
  headword: "test",
  sourceLanguage: "en",
  frequencyRank: 1,
  senses: [{
    id: "sense-1",
    partOfSpeech: "noun",
    definition: "a test",
    example: null,
    tags: [],
    usageRank: 0,
    translations: [{
      id: "trans-1",
      senseId: "sense-1",
      targetLanguage: "vi",
      translation: "kiem tra",
      isPrimary: true,
      rank: 1,
      confidence: null,
      status: "reviewed",
      sourceType: "seed",
      sourceName: null,
      reviewedAt: null,
      sourceLabel: "Seed Data",
    }],
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("GET /api/dictionary/entries/:entryId", () => {
  it("returns entry detail for a valid entry id", async () => {
    routeMocks.getDictionaryEntryDetail.mockResolvedValue(dictionaryEntry);

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=en&targetLanguage=vi"),
      createParams(ENTRY_UUID),
    );
    const payload = await readJsonResponse(response);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toMatchObject({ success: true, data: dictionaryEntry });
    expect(routeMocks.getDictionaryEntryDetail).toHaveBeenCalledWith(ENTRY_UUID, {
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
  });

  it("returns 404 for a non-existent entry id", async () => {
    routeMocks.getDictionaryEntryDetail.mockResolvedValue(null);

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(MISSING_UUID, "sourceLanguage=en&targetLanguage=vi"),
      createParams(MISSING_UUID),
    );

    expect(response.status).toBe(404);
    expectApiErrorPayload(await readJsonResponse(response), "Entry not found.");
  });

  it("returns 400 for an empty entry id", async () => {
    const response = await dictionaryEntryDetail(
      createEntryDetailRequest("", "sourceLanguage=en&targetLanguage=vi"),
      createParams(""),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(await readJsonResponse(response), "Invalid entry id.");
  });

  it("returns 400 for a non-UUID entry id", async () => {
    const response = await dictionaryEntryDetail(
      createEntryDetailRequest("entry-1", "sourceLanguage=en&targetLanguage=vi"),
      createParams("entry-1"),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(await readJsonResponse(response), "Invalid entry id.");
  });

  it("returns 400 for invalid query parameters", async () => {
    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=fr&targetLanguage=vi"),
      createParams(ENTRY_UUID),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(await readJsonResponse(response), "Invalid query parameters.");
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=en&targetLanguage=vi"),
      createParams(ENTRY_UUID),
    );

    expect(response.status).toBe(401);
    expectApiErrorPayload(await readJsonResponse(response), "Authentication required.");
  });
});
