import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as translateRoute } from "@/app/api/translate/route";
import { POST as vocabularyRoute } from "@/app/api/vocabulary/route";
import { createJsonRequest, readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { passageFixture, userProfileFixture } from "../../fixtures";
import { db } from "../../mocks/db";
import { generateObject } from "../../mocks/ai";
import { createRequestLogger } from "../../mocks/logger";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  translateWithNonAiProvider: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/lib/translation/non-ai-machine-translation-provider", () => ({
  translateWithNonAiProvider: routeMocks.translateWithNonAiProvider,
}));

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
    mode: "quick",
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
  expectApiErrorPayload(await readJsonResponse(response), message);
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
    const normalizedTerm = allStrings.find((v) => !["en", "vi", "true"].includes(v));
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

    db.passage.findUnique.mockResolvedValueOnce(null);
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
    "resolves quick dictionary translation for %s without AI",
    async (text, context, expectedTranslation) => {
      const response = await translateRoute(createJsonRequest(translationBody({ text, context })));
      const payload = await readJsonResponse(response);

      expect(response.status).toBe(200);
      expectApiSuccessPayload(payload);
      expect(payload).toMatchObject({
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
    db.translationCache.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ provider: "fallback", response: fallback });

    const first = await translateRoute(
      createJsonRequest(translationBody({ text: "quorvex drift", context: TEST_CONTEXT[3] })),
    );
    expect(await readJsonResponse(first)).toMatchObject({ success: true, data: fallback });
    expect(generateObject).not.toHaveBeenCalled();
    expect(db.translationCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ provider: "fallback", selectedText: "quorvex drift" }),
        update: expect.objectContaining({ provider: "fallback" }),
      }),
    );

    db.dictionaryEntry.findUnique.mockClear();
    db.dictionaryAlias.findFirst.mockClear();
    db.translationCache.upsert.mockClear();
    const repeat = await translateRoute(
      createJsonRequest(translationBody({ text: "quorvex drift", context: TEST_CONTEXT[3] })),
    );
    expect(await readJsonResponse(repeat)).toMatchObject({
      success: true,
      data: { ...fallback, provider: "cache" },
    });
    expect(db.dictionaryEntry.findUnique).not.toHaveBeenCalled();
    expect(db.dictionaryAlias.findFirst).not.toHaveBeenCalled();
    expect(db.translationCache.upsert).not.toHaveBeenCalled();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("uses AI only for detailed cache misses and captures detailed AI failures", async () => {
    generateObject.mockResolvedValueOnce({
      object: {
        translation: "thiên lệch thuật toán",
        explanation: "A systematic unfair pattern in an automated process.",
        meaningInSentence: "The phrase names a hiring-system risk.",
        sentenceTranslation: "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
        examples: ["Teams audit algorithmic bias before release."],
        relatedWords: ["fairness"],
        pronunciation: null,
        type: "noun phrase",
      },
    });

    const response = await translateRoute(
      createJsonRequest(translationBody({ mode: "detailed", text: "algorithmic bias", context: TEST_CONTEXT[0] })),
    );
    const payload = await readJsonResponse<{
      performance: {
        timings: { totalMs: number; steps: Record<string, number> };
        prisma: {
          queryCount: number;
          totalDurationMs: number;
          steps: Record<string, { queries: number; ms: number }>;
        };
      };
    } & Record<string, unknown>>(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        translation: "thiên lệch thuật toán",
        provider: "ai",
      },
    });
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(db.translationCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ provider: "ai", mode: "detailed" }),
        update: expect.objectContaining({ provider: "ai" }),
      }),
    );

    const error = new Error("model unavailable");
    generateObject.mockRejectedValueOnce(error);
    await expectJsonError(
      await translateRoute(createJsonRequest(translationBody({ mode: "detailed" }))),
      500,
      "Unable to translate the selection.",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:translate", method: "POST" },
    });
  });

  it("records privacy-safe spans and logs without raw selected text or context", async () => {
    await translateRoute(createJsonRequest(translationBody({ text: "algorithmic bias", context: TEST_CONTEXT[0] })));

    const spanMetadata = vi.mocked(Sentry.startSpan).mock.calls.map(([metadata]) => metadata);
    expect(spanMetadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "api:translate-authenticate", op: "auth" }),
        expect.objectContaining({ name: "db:translate-cache-fetch", op: "db" }),
        expect.objectContaining({ name: "dictionary:quick-resolve", op: "function" }),
        expect.objectContaining({ name: "db:translate-cache-upsert", op: "db" }),
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
    const payload = await readJsonResponse<{
      performance: {
        timings: { totalMs: number; steps: Record<string, number> };
      };
    } & Record<string, unknown>>(response);

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
        auth: expect.any(Number),
        cacheRead: expect.any(Number),
        sourceFetch: expect.any(Number),
        dictionaryResolve: expect.any(Number),
        cacheWrite: expect.any(Number),
      }),
    );

    const serializedPayload = JSON.stringify(payload.performance);
    expect(serializedPayload).not.toContain("algorithmic bias");
    expect(serializedPayload).not.toContain(TEST_CONTEXT[0]);
  });

  it("routes sentence-length quick translation to non-AI provider without calling AI", async () => {
    const sentenceText = "Key concerns include algorithmic bias in automated hiring systems.";
    routeMocks.translateWithNonAiProvider.mockResolvedValueOnce({
      translation: "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
      provider: "google_translate",
    });

    const response = await translateRoute(
      createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
    );
    const payload = await readJsonResponse(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        translation: "Các mối quan tâm chính bao gồm thiên lệch thuật toán trong hệ thống tuyển dụng tự động.",
        type: null,
        provider: "google_translate",
      },
    });
    expect(generateObject).not.toHaveBeenCalled();
    expect(routeMocks.translateWithNonAiProvider).toHaveBeenCalledWith({
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
    db.translationCache.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ provider: "google_translate", response: cachedResponse });

    routeMocks.translateWithNonAiProvider.mockResolvedValueOnce({
      translation: cachedResponse.translation,
      provider: "google_translate",
    });

    const first = await translateRoute(
      createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
    );
    expect(await readJsonResponse(first)).toMatchObject({
      success: true,
      data: cachedResponse,
    });
    expect(routeMocks.translateWithNonAiProvider).toHaveBeenCalledTimes(1);

    routeMocks.translateWithNonAiProvider.mockClear();
    db.translationCache.upsert.mockClear();
    const repeat = await translateRoute(
      createJsonRequest(translationBody({ text: sentenceText, context: TEST_CONTEXT[0] })),
    );
    expect(await readJsonResponse(repeat)).toMatchObject({
      success: true,
      data: { ...cachedResponse, provider: "cache" },
    });
    expect(routeMocks.translateWithNonAiProvider).not.toHaveBeenCalled();
    expect(db.translationCache.upsert).not.toHaveBeenCalled();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns 500 when non-AI provider fails without falling back to AI", async () => {
    const sentenceText = "Key concerns include algorithmic bias in automated hiring systems.";
    routeMocks.translateWithNonAiProvider.mockRejectedValueOnce(new Error("provider unavailable"));

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
    await expectJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody({ selectedText: "" }))),
      400,
      "Invalid vocabulary request.",
    );

    routeMocks.getAuthenticatedUser.mockRejectedValueOnce(new Error("Authentication required"));
    await expectJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody())),
      401,
      "Authentication required.",
    );

    db.passage.findUnique.mockResolvedValueOnce(null);
    await expectJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody())),
      404,
      "Source not found.",
    );
  });

  it("saves vocabulary through an upsert and reuses duplicates", async () => {
    const requestInit = { url: "https://english-reading.test/api/vocabulary" };
    const first = await vocabularyRoute(createJsonRequest(vocabularyBody(), requestInit));
    const duplicate = await vocabularyRoute(createJsonRequest(vocabularyBody(), requestInit));

    expect(await readJsonResponse(first)).toMatchObject({
      success: true,
      data: {
        id: "vocabulary-item-1",
        selectedText: "algorithmic bias",
        translation: "thiên lệch thuật toán",
      },
    });
    expect(await readJsonResponse(duplicate)).toMatchObject({
      success: true,
      data: { id: "vocabulary-item-1" },
    });
    expect(db.vocabularyItem.upsert).toHaveBeenCalledTimes(2);
    expect(db.vocabularyItem.upsert).toHaveBeenCalledWith({
      where: { normalizedKey: expect.any(String) },
      update: expect.objectContaining({
        translation: "thiên lệch thuật toán",
        type: "noun phrase",
      }),
      create: expect.objectContaining({
        userId: userProfileFixture.id,
        sourceId: passageFixture.id,
        selectedText: "algorithmic bias",
        targetLanguage: "vi",
      }),
      select: expect.objectContaining({
        id: true,
        selectedText: true,
        translation: true,
      }),
    });
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: "db:vocabulary-upsert", op: "db" }),
      expect.any(Function),
    );
    expect(createRequestLogger).toHaveBeenCalledWith(
      "api:vocabulary",
      expect.objectContaining({ method: "POST", path: "/api/vocabulary" }),
    );
  });

  it("captures unexpected vocabulary failures with route tags", async () => {
    const error = new Error("vocabulary write failed");
    db.vocabularyItem.upsert.mockRejectedValueOnce(error);

    await expectJsonError(
      await vocabularyRoute(createJsonRequest(vocabularyBody())),
      500,
      "Unable to save vocabulary.",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:vocabulary", method: "POST" },
    });
  });
});
