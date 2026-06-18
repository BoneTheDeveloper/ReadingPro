import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionaryLookup } from "@/app/api/dictionary/lookup/route";
import {
  dictionaryLookupPerformanceResponseSchema,
  dictionaryLookupResponseSchema,
  dictionaryLookupSuccessResponseSchema,
} from "@/contracts/dictionary/dictionary-response-schema";
import type { DictionaryEntryDto, DictionaryMissDto } from "@/contracts/dictionary/dictionary-dtos";
import { userProfileFixture } from "../../fixtures";
import { parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getUserId: vi.fn(),
  resolveDictionaryLookup: vi.fn(),
}));

vi.mock("@/server/auth/auth-utils", () => ({
  getUserId: routeMocks.getUserId,
}));

vi.mock("@/server/modules/dictionary/lookup/lookup.service", () => ({
  resolveDictionaryLookup: routeMocks.resolveDictionaryLookup,
}));

function createLookupRequest(query: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`https://english-reading.test/api/dictionary/lookup?${query}`, init);
}

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await parseJsonResponse(response, dictionaryLookupResponseSchema), message);
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
  routeMocks.getUserId.mockResolvedValue(userProfileFixture.id);
});

describe("GET /api/dictionary/lookup", () => {
  it("returns a found entry for a valid query", async () => {
    routeMocks.resolveDictionaryLookup.mockResolvedValue(lookupResult);

    const response = await dictionaryLookup(
      createLookupRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );
    const payload = await parseJsonResponse(response, dictionaryLookupSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: lookupResult });
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
    const payload = await parseJsonResponse(response, dictionaryLookupSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: missResult });
  });

  it("returns explicit performance diagnostics when requested", async () => {
    routeMocks.resolveDictionaryLookup.mockResolvedValue(lookupResult);

    const response = await dictionaryLookup(
      createLookupRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi", {
        headers: { "x-dictionary-perf-metrics": "1" },
      }),
    );
    const payload = await parseJsonResponse(response, dictionaryLookupPerformanceResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: lookupResult,
      performance: {
        queryLength: 9,
        normalizedQueryLength: 9,
        phase: "lookup",
        timings: {
          totalMs: expect.any(Number),
          steps: expect.objectContaining({
            auth: expect.any(Number),
            lookupResolve: expect.any(Number),
          }),
        },
        prisma: {
          queryCount: expect.any(Number),
          totalDurationMs: expect.any(Number),
          steps: expect.any(Object),
        },
      },
    });
  });

  it("rejects empty query parameters before authentication", async () => {
    const response = await dictionaryLookup(
      createLookupRequest("q=&sourceLanguage=en&targetLanguage=vi"),
    );

    await expectJsonError(response, 400, "Invalid query parameters.");
    expect(routeMocks.getUserId).not.toHaveBeenCalled();
    expect(routeMocks.resolveDictionaryLookup).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    routeMocks.getUserId.mockRejectedValue(new Error("Authentication required"));

    const response = await dictionaryLookup(
      createLookupRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );

    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns a stable 500 error when lookup resolution fails", async () => {
    routeMocks.resolveDictionaryLookup.mockRejectedValue(new Error("db down"));

    const response = await dictionaryLookup(
      createLookupRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
    );

    await expectJsonError(response, 500, "Dictionary lookup failed.");
  });
});
