import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as translateRoute } from "@/app/api/translate/route";
import { POST as vocabularyRoute } from "@/app/api/vocabulary/route";
import {
  translatePerformanceResponseSchema,
  translateResponseSchema,
  translateSuccessResponseSchema,
  vocabularyResponseSchema,
  vocabularySuccessResponseSchema,
} from "@/lib/translation/shared/translation-response-schema";
import { createJsonRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError as expectApiJsonError } from "../../helpers/api-test-helpers";
import { passageFixture, userProfileFixture } from "../../fixtures";
import { db } from "../../mocks/db";
import { generateObject } from "../../mocks/ai";
import { createRequestLogger } from "../../mocks/logger";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  translateWithProvider: vi.fn(),
  upsertVocabularyItem: vi.fn(),
  getOwnedTranslationSource: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/lib/translation/translation-provider", () => ({
  translateWithProvider: routeMocks.translateWithProvider,
}));

vi.mock("@/lib/db/vocabulary-queries", () => ({
  upsertVocabularyItem: routeMocks.upsertVocabularyItem,
}));

vi.mock("@/lib/db/translation-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/translation-queries")>();
  return {
    ...actual,
    getOwnedTranslationSource: routeMocks.getOwnedTranslationSource,
  };
});

const TEST_CONTEXT = [
  "Key concerns include algorithmic bias in automated hiring systems.",
  "The algorithm can amplify bias when training data is incomplete.",
  "Researchers use evidence to audit the model.",
  "The passage also mentions quorvex drift, a term outside the seed dictionary.",
];

const dictionaryEntries = [
  makeEntry("algorithmic bias", [{ pos: "noun phrase", translation: "thiên lệch thuật toán", confidence: 0.98, rank: 1 }]),
  makeEntry("algorithm", [{ pos: "noun", translation: "thuật toán", confidence: 0.96, rank: 1 }]),
  makeEntry("bias", [{ pos: "noun", translation: "thiên lệch", confidence: 0.72, rank: 1 }]),
  makeEntry("data", [{ pos: "noun", translation: "dữ liệu", confidence: 0.95, rank: 1 }]),
  makeEntry("drift", [{ pos: "noun", translation: "sự trôi", confidence: 0.88, rank: 1 }]),
];

function makeEntry(headword: string, senses: { pos: string; translation: string; confidence: number; rank: number }[]) {
  const normalizedHeadword = headword.toLowerCase().replace(/\s+/g, " ").trim();
  return {
    id: `dict-${normalizedHeadword.replaceAll(" ", "-")}`,
    headword,
    normalizedHeadword,
    sourceLanguage: "en",
    frequencyRank: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    senses: senses.map((s, i) => ({
      id: `sense-${normalizedHeadword.replaceAll(" ", "-")}-${i}`,
      entryId: `dict-${normalizedHeadword.replaceAll(" ", "-")}`,
      partOfSpeech: s.pos,
      definition: null,
      example: null,
      tags: [],
      usageRank: i,
      createdAt: new Date(),
      updatedAt: new Date(),
      translations: [{
        id: `tr-${normalizedHeadword.replaceAll(" ", "-")}-${i}`,
        senseId: `sense-${normalizedHeadword.replaceAll(" ", "-")}-${i}`,
        targetLanguage: "vi",
        translation: s.translation,
        isPrimary: true,
        rank: s.rank,
        confidence: s.confidence,
        status: "reviewed",
        sourceType: "seed",
        sourceName: "reviewed",
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    })),
    aliases: [],
  };
}

function translationBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    text: "algorithmic bias",
    context: TEST_CONTEXT[0],
    sourceId: passageFixture.id,
    sourceLanguage: "en",
    targetLanguage: "vi",
    ...overrides,
  };
}

function vocabularyBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sourceId: passageFixture.id,
    selectedText: "algorithmic bias",
    translation: "thiên lệch thuật toán",
    contextSentence: TEST_CONTEXT[0],
    sourceLanguage: "en",
    targetLanguage: "vi",
    type: "noun phrase",
    ...overrides,
  };
}

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  const payload = await parseJsonResponse(response, translateResponseSchema);
  expectApiErrorPayload(payload, message);
}

async function expectVocabularyJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  const payload = await parseJsonResponse(response, vocabularyResponseSchema);
  expectApiErrorPayload(payload, message);
}

function mockOwnedSource() {
  db.passage.findUnique.mockResolvedValue({ id: passageFixture.id, title: passageFixture.title });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  mockOwnedSource();
  db.translationCache.findUnique.mockResolvedValue(null);
  db.translationCache.upsert.mockResolvedValue({ id: "translation-cache-1" });
  db.translationHistory.create.mockResolvedValue({ id: "translation-history-1" });
  db.vocabularyItem.upsert.mockResolvedValue({
    id: "vocabulary-item-1",
    selectedText: "algorithmic bias",
    translation: "thiên lệch thuật toán",
    type: "noun phrase",
    createdAt: new Date("2026-05-29T00:00:00.000Z"),
    updatedAt: new Date("2026-05-29T00:00:00.000Z"),
  });
  routeMocks.upsertVocabularyItem.mockResolvedValue({
    id: "vocabulary-item-1",
    normalizedText: "algorithmic bias",
    displayText: "algorithmic bias",
    translation: "thiên lệch thuật toán",
    type: "PHRASE",
    sourceLanguage: "en",
    targetLanguage: "vi",
    source: "TRANSLATE",
    status: "NEW",
    savedCount: 1,
    createdAt: new Date("2026-05-29T00:00:00.000Z"),
    updatedAt: new Date("2026-05-29T00:00:00.000Z"),
  });
  routeMocks.getOwnedTranslationSource.mockResolvedValue({
    id: passageFixture.id,
    title: passageFixture.title,
  });
  db.dictionaryEntry.findUnique.mockImplementation(async (query: { where?: { normalizedHeadword_sourceLanguage?: { normalizedHeadword?: string } } }) => {
    const term = query.where?.normalizedHeadword_sourceLanguage?.normalizedHeadword;
    if (!term) return null;
    return dictionaryEntries.find((item) => item.normalizedHeadword === term) ?? null;
  });
  db.dictionaryAlias.findFirst.mockResolvedValue(null);
  db.$queryRaw.mockImplementation(async (...args: unknown[]) => {
    const values = args.slice(1);
    const allStrings: string[] = [];
    for (const v of values) {
      if (typeof v === "string") {
        allStrings.push(v);
      } else if (v && typeof v === "object" && "values" in v) {
        const sql = v as { values: unknown[] };
        for (const sv of sql.values) {
          if (typeof sv === "string") allStrings.push(sv);
        }
      }
    }

    // Combined cache + source query: contains cacheKey (hex hash), userId, sourceId
    const sourceId = allStrings.find((v) => passageFixture.id === v);
    if (sourceId) {
      return [{ cacheProvider: null, cacheResponse: null, sourceId, sourceTitle: passageFixture.title }];
    }

    // Dictionary lookup query: contains normalizedTerm
    const normalizedTerm = allStrings.find((v) => !["en", "vi", "true"].includes(v) && v !== passageFixture.id);
    if (!normalizedTerm) return [];
    const entry = dictionaryEntries.find((e) => e.normalizedHeadword === normalizedTerm);
    if (!entry || !entry.senses.length) return [];
    const sense = entry.senses[0];
    const tr = sense.translations[0];
    return [{
      id: tr.id,
      senseId: sense.id,
      targetLanguage: tr.targetLanguage,
      translation: tr.translation,
      isPrimary: tr.isPrimary,
      rank: tr.rank,
      confidence: tr.confidence,
      status: tr.status,
      sourceType: tr.sourceType,
      sourceName: tr.sourceName,
      reviewedAt: tr.reviewedAt,
      matchType: 0,
    }];
  });
});

describe("POST /api/translate", () => {
  it("rejects invalid JSON, invalid bodies, unauthenticated users, and missing sources", async () => {
    await expectJsonError(
      await translateRoute(new NextRequest("https://english-reading.test/api/translate", { method: "POST", body: "{" })),
      400,
      "Invalid JSON payload.",
    );

    await expectJsonError(
      await translateRoute(createJsonRequest(translationBody({ text: "" }))),
      400,
      "Invalid translation request.",
    );

    routeMocks.getAuthenticatedUser.mockRejectedValueOnce(new Error("Authentication required"));
    await expectJsonError(
      await translateRoute(createJsonRequest(translationBody())),
      401,
      "Authentication required.",
    );

    db.$queryRaw.mockResolvedValueOnce([]);
    await expectJsonError(
      await translateRoute(createJsonRequest(translationBody())),
      404,
      "Source not found.",
    );

    expect(createRequestLogger).toHaveBeenCalledWith(
      "api:translate",
      expect.objectContaining({ method: "POST", path: "/api/translate" }),
    );
  });

  it.each([
    ["algorithmic bias", TEST_CONTEXT[0], "thiên lệch thuật toán"],
    ["algorithm", TEST_CONTEXT[1], "thuật toán"],
    ["bias", TEST_CONTEXT[0], "thiên lệch"],
    ["data", TEST_CONTEXT[1], "dữ liệu"],
  ])(
    "resolves dictionary translation for %s without AI",
    async (text, context, expectedTranslation) => {
      const response = await translateRoute(createJsonRequest(translationBody({ text, context })));
      const payload = await parseJsonResponse(response, translateSuccessResponseSchema);

      expect(response.status).toBe(200);
      expectApiSuccessPayload(payload);
      expect(payload).toEqual({
        success: true,
        data: {
          translation: expectedTranslation,
          type: null,
          provider: "dictionary",
        },
      });
      expect(generateObject).not.toHaveBeenCalled();
      expect(db.translationCache.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            provider: "dictionary",
            selectedText: text,
            contextSentence: context,
            mode: "quick",
          }),
          update: expect.objectContaining({
            provider: "dictionary",
          }),
        }),
      );
      expect(db.translationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: "dictionary",
          selectedText: text,
          translation: expectedTranslation,
        }),
      });
    },
  );

  it("returns deterministic quick fallback without AI and reuses the exact cache on repeat", async () => {
    const fallback = {
      translation: "quorvex drift",
      type: null,
      provider: "fallback",
    };
    // First request: cache+source miss, then dictionary lookup (no match), then cache+source hit on repeat
    db.$queryRaw
      .mockResolvedValueOnce([{ cacheProvider: null, cacheResponse: null, sourceId: passageFixture.id, sourceTitle: passageFixture.title }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cacheProvider: "fallback", cacheResponse: fallback, sourceId: passageFixture.id, sourceTitle: passageFixture.title }]);

    const first = await translateRoute(
      createJsonRequest(translationBody({ text: "quorvex drift", context: TEST_CONTEXT[3] })),
    );
    expect(await parseJsonResponse(first, translateSuccessResponseSchema)).toEqual({ success: true, data: fallback });
    expect(generateObject).not.toHaveBeenCalled();

    db.dictionaryEntry.findUnique.mockClear();
    db.dictionaryAlias.findFirst.mockClear();
    db.translationCache.upsert.mockClear();
    const repeat = await translateRoute(
      createJsonRequest(translationBody({ text: "quorvex drift", context: TEST_CONTEXT[3] })),
    );
    expect(await parseJsonResponse(repeat, translateSuccessResponseSchema)).toEqual({
      success: true,
      data: { ...fallback, provider: "cache" },
    });
    expect(db.dictionaryEntry.findUnique).not.toHaveBeenCalled();
    expect(db.dictionaryAlias.findFirst).not.toHaveBeenCalled();
    expect(db.translationCache.upsert).not.toHaveBeenCalled();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("rejects requests containing a mode field with 400", async () => {
    const response = await translateRoute(
      createJsonRequest({ ...translationBody({ text: "algorithmic bias", context: TEST_CONTEXT[0] }), mode: "detailed" }),
    );
    await expectJsonError(response, 400, "Invalid translation request.");
  });

  it("records privacy-safe spans and logs without raw selected text or context", async () => {
    await translateRoute(createJsonRequest(translationBody({ text: "algorithmic bias", context: TEST_CONTEXT[0] })));

    const spanMetadata = vi.mocked(Sentry.startSpan).mock.calls.map(([metadata]) => metadata);
    expect(spanMetadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "api:translate-authenticate", op: "auth" }),
        expect.objectContaining({ name: "db:translate-cache-and-source-fetch", op: "db" }),
        expect.objectContaining({ name: "word-translate:resolve", op: "function" }),
      ]),
    );
    const serializedSpanMetadata = JSON.stringify(spanMetadata);
    expect(serializedSpanMetadata).not.toContain("algorithmic bias");
    expect(serializedSpanMetadata).not.toContain(TEST_CONTEXT[0]);
  });

  it("returns test-only performance metrics when the translate metrics header is present", async () => {
    const response = await translateRoute(createJsonRequest(
      translationBody({
        text: "algorithmic bias",
        context: TEST_CONTEXT[0],
        clientMetrics: { wordsBeforeSelected: 3 },
      }),
      { headers: { "x-translate-perf-metrics": "1" } },
    ));
    const payload = await parseJsonResponse(response, translatePerformanceResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        translation: "thiên lệch thuật toán",
        provider: "dictionary",
      },
      performance: {
        selectedTextWordCount: 2,
        contextWordCount: 9,
        wordsBeforeSelected: 3,
        resolutionSource: "phrase",
        prisma: {
          queryCount: expect.any(Number),
          totalDurationMs: expect.any(Number),
          steps: expect.any(Object),
        },
      },
    });
    expect(payload.performance.timings.totalMs).toEqual(expect.any(Number));
    expect(payload.performance.timings.steps).toEqual(
      expect.objectContaining({
        parseBody: expect.any(Number),
        validateRequest: expect.any(Number),
        cacheAndSourceRead: expect.any(Number),
        dictionaryResolve: expect.any(Number),
      }),
    );

    const serializedPayload = JSON.stringify(payload.performance);
    expect(serializedPayload).not.toContain("algorithmic bias");
    expect(serializedPayload).not.toContain(TEST_CONTEXT[0]);
  });

  it("routes sentence-length quick translation to non-AI provider without calling AI", async () => {
    const sentenceText = "Key concerns include algorithmic bias in automated hiring systems.";
    routeMocks.translateWithProvider.mockResolvedValueOnce({
      translation: "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
      provider: "google_translate",
    });

    const response = await translateRoute(
      createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
    );
    const payload = await parseJsonResponse(response, translateSuccessResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        translation: "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
        type: null,
        provider: "google_translate",
      },
    });
    expect(generateObject).not.toHaveBeenCalled();
    expect(routeMocks.translateWithProvider).toHaveBeenCalledWith({
      text: sentenceText,
      sourceLanguage: "en",
      targetLanguage: "vi",
    });
    expect(db.translationCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ provider: "google_translate", selectedText: sentenceText }),
        update: expect.objectContaining({ provider: "google_translate" }),
      }),
    );
  });

  it("returns cached machine translation on repeat without re-calling non-AI provider", async () => {
    const sentenceText = "Key concerns include algorithmic bias in automated hiring systems.";
    const cachedResponse = {
      translation: "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
      type: null,
      provider: "google_translate",
    };
    // First call: cache miss, second call: cache hit
    db.$queryRaw
      .mockResolvedValueOnce([{ cacheProvider: null, cacheResponse: null, sourceId: passageFixture.id, sourceTitle: passageFixture.title }])
      .mockResolvedValueOnce([{ cacheProvider: "google_translate", cacheResponse: cachedResponse, sourceId: passageFixture.id, sourceTitle: passageFixture.title }]);

    routeMocks.translateWithProvider.mockResolvedValueOnce({
      translation: cachedResponse.translation,
      provider: "google_translate",
    });

    const first = await translateRoute(
      createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
    );
    expect(await parseJsonResponse(first, translateSuccessResponseSchema)).toEqual({
      success: true,
      data: cachedResponse,
    });
    expect(routeMocks.translateWithProvider).toHaveBeenCalledTimes(1);

    routeMocks.translateWithProvider.mockClear();
    db.translationCache.upsert.mockClear();
    const repeat = await translateRoute(
      createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
    );
    expect(await parseJsonResponse(repeat, translateSuccessResponseSchema)).toEqual({
      success: true,
      data: { ...cachedResponse, provider: "cache" },
    });
    expect(routeMocks.translateWithProvider).not.toHaveBeenCalled();
    expect(db.translationCache.upsert).not.toHaveBeenCalled();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns 500 when non-AI provider fails without falling back to AI", async () => {
    const sentenceText = "Key concerns include algorithmic bias in automated hiring systems.";
    routeMocks.translateWithProvider.mockRejectedValueOnce(new Error("provider unavailable"));

    await expectJsonError(
      await translateRoute(
        createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
      ),
      500,
      "Unable to translate the selection.",
    );
    expect(generateObject).not.toHaveBeenCalled();
  });
});

describe("POST /api/vocabulary", () => {
  it("rejects invalid payloads, unauthenticated users, and missing sources", async () => {
    await expectVocabularyJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody({ selectedText: "" }))),
      400,
      "Invalid vocabulary request.",
    );

    routeMocks.getAuthenticatedUser.mockRejectedValueOnce(new Error("Authentication required"));
    await expectVocabularyJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody())),
      401,
      "Authentication required.",
    );

    routeMocks.getOwnedTranslationSource.mockResolvedValueOnce(null);
    await expectVocabularyJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody())),
      404,
      "Source not found.",
    );
  });

  it("saves vocabulary through an upsert and reuses duplicates", async () => {
    const first = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    const duplicate = await vocabularyRoute(createJsonRequest(vocabularyBody()));

    const firstBody = await first.json();
    expect(firstBody).toMatchObject({
      success: true,
      data: {
        id: "vocabulary-item-1",
        translation: "thiên lệch thuật toán",
      },
    });
    const dupBody = await duplicate.json();
    expect(dupBody).toMatchObject({
      success: true,
      data: {
        id: "vocabulary-item-1",
        translation: "thiên lệch thuật toán",
      },
    });
    expect(routeMocks.upsertVocabularyItem).toHaveBeenCalledTimes(2);
    expect(routeMocks.upsertVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userProfileFixture.id,
        selectedText: "algorithmic bias",
        translation: "thiên lệch thuật toán",
        sourceId: passageFixture.id,
      }),
    );
  });

  it("captures unexpected vocabulary failures with route tags", async () => {
    const error = new Error("vocabulary write failed");
    routeMocks.upsertVocabularyItem.mockRejectedValueOnce(error);

    await expectApiJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody())),
      500,
      "Unable to save vocabulary.",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:vocabulary", method: "POST" },
    });
  });
});
