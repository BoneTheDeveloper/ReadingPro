import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionaryEntryDetail } from "@/app/api/dictionary/entries/[entryId]/route";
import {
  dictionaryEntryDetailPerformanceResponseSchema,
  dictionaryEntryDetailResponseSchema,
  dictionaryEntryDetailSuccessResponseSchema,
} from "@/shared/dictionary/dictionary-response-schema";
import type { DictionaryEntryDto } from "@/shared/dictionary/dictionary-dtos";
import { userProfileFixture } from "../../fixtures/user";
import { parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getDictionaryEntryDetail: vi.fn(),
}));

vi.mock("@/server/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/server/modules/dictionary/entry-detail/entry-detail.service", () => ({
  getDictionaryEntryDetail: routeMocks.getDictionaryEntryDetail,
}));

function createEntryDetailRequest(
  entryId: string,
  query: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return new NextRequest(
    `https://english-reading.test/api/dictionary/entries/${entryId}?${query}`,
    init,
  );
}

function createParams(entryId: string) {
  return { params: Promise.resolve({ entryId }) };
}

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await parseJsonResponse(response, dictionaryEntryDetailResponseSchema), message);
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
    const payload = await parseJsonResponse(response, dictionaryEntryDetailSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: dictionaryEntry });
    expect(routeMocks.getDictionaryEntryDetail).toHaveBeenCalledWith(ENTRY_UUID, {
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
  });

  it("returns explicit performance diagnostics when requested", async () => {
    routeMocks.getDictionaryEntryDetail.mockResolvedValue(dictionaryEntry);

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=en&targetLanguage=vi", {
        headers: { "x-dictionary-perf-metrics": "1" },
      }),
      createParams(ENTRY_UUID),
    );
    const payload = await parseJsonResponse(response, dictionaryEntryDetailPerformanceResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: dictionaryEntry,
      performance: {
        queryLength: ENTRY_UUID.length,
        normalizedQueryLength: ENTRY_UUID.length,
        phase: "entry-detail",
        timings: {
          totalMs: expect.any(Number),
          steps: expect.objectContaining({
            auth: expect.any(Number),
            entryDetailResolve: expect.any(Number),
          }),
        },
      },
    });
  });

  it("returns 404 for a non-existent entry id", async () => {
    routeMocks.getDictionaryEntryDetail.mockResolvedValue(null);

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(MISSING_UUID, "sourceLanguage=en&targetLanguage=vi"),
      createParams(MISSING_UUID),
    );

    await expectJsonError(response, 404, "Entry not found.");
  });

  it("returns 400 for an empty entry id", async () => {
    const response = await dictionaryEntryDetail(
      createEntryDetailRequest("", "sourceLanguage=en&targetLanguage=vi"),
      createParams(""),
    );

    await expectJsonError(response, 400, "Invalid entry id.");
  });

  it("returns 400 for a non-UUID entry id", async () => {
    const response = await dictionaryEntryDetail(
      createEntryDetailRequest("entry-1", "sourceLanguage=en&targetLanguage=vi"),
      createParams("entry-1"),
    );

    await expectJsonError(response, 400, "Invalid entry id.");
  });

  it("returns 400 for invalid query parameters", async () => {
    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=fr&targetLanguage=vi"),
      createParams(ENTRY_UUID),
    );

    await expectJsonError(response, 400, "Invalid query parameters.");
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=en&targetLanguage=vi"),
      createParams(ENTRY_UUID),
    );

    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns a stable 500 error when entry detail resolution fails", async () => {
    routeMocks.getDictionaryEntryDetail.mockRejectedValue(new Error("db down"));

    const response = await dictionaryEntryDetail(
      createEntryDetailRequest(ENTRY_UUID, "sourceLanguage=en&targetLanguage=vi"),
      createParams(ENTRY_UUID),
    );

    await expectJsonError(response, 500, "Entry detail failed.");
  });
});
