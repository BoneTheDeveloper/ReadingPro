import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as vocabularyRoute } from "@/app/api/vocabulary/route";
import { createJsonRequest } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { passageFixture, userProfileFixture } from "../../fixtures";

const VOCABULARY_ITEM_ID = "550e8400-e29b-41d4-a716-446655440001";
const SOURCE_ID = passageFixture.id;

const vocabularyItemFixture = {
  id: VOCABULARY_ITEM_ID,
  userId: userProfileFixture.id,
  normalizedText: "ephemeral",
  displayText: "ephemeral",
  type: "WORD",
  translation: "hap dan",
  sourceLanguage: "en",
  targetLanguage: "vi",
  source: "TRANSLATE",
  dictionaryEntryId: null,
  dictionarySenseId: null,
  status: "NEW",
  savedCount: 1,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-01T00:00:00.000Z"),
};

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  upsertVocabularyItem: vi.fn(),
  getOwnedTranslationSource: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  },
}));

vi.mock("@/lib/db/vocabulary-queries", () => ({
  upsertVocabularyItem: routeMocks.upsertVocabularyItem,
}));

vi.mock("@/lib/db/translation-queries", () => ({
  getOwnedTranslationSource: routeMocks.getOwnedTranslationSource,
}));

function vocabularyBody(overrides: Record<string, unknown> = {}) {
  return {
    selectedText: "ephemeral",
    translation: "hap dan",
    sourceLanguage: "en",
    targetLanguage: "vi",
    sourceId: SOURCE_ID,
    contextSentence: "The ephemeral nature of beauty.",
    ...overrides,
  };
}

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await response.json(), message);
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.upsertVocabularyItem.mockResolvedValue(vocabularyItemFixture);
  routeMocks.getOwnedTranslationSource.mockResolvedValue({
    id: passageFixture.id,
    title: passageFixture.title,
  });
});

describe("POST /api/vocabulary (save from translate)", () => {
  it("creates item via upsertVocabularyItem", async () => {
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(routeMocks.upsertVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userProfileFixture.id,
        selectedText: "ephemeral",
        translation: "hap dan",
        source: "TRANSLATE",
        sourceId: SOURCE_ID,
        contextSentence: "The ephemeral nature of beauty.",
      }),
    );
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new NextRequest("https://english-reading.test/api/vocabulary", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not json {{{",
    });
    const response = await vocabularyRoute(request);
    await expectJsonError(response, 400, "Invalid JSON payload.");
  });

  it("rejects missing fields with 400", async () => {
    const response = await vocabularyRoute(createJsonRequest({ selectedText: "", translation: "" }));
    await expectJsonError(response, 400, "Invalid vocabulary request.");
    expect(routeMocks.upsertVocabularyItem).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 404 when source passage not found", async () => {
    routeMocks.getOwnedTranslationSource.mockResolvedValue(null);
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    await expectJsonError(response, 404, "Source not found.");
  });

  it("returns 500 when upsert fails", async () => {
    routeMocks.upsertVocabularyItem.mockRejectedValue(new Error("db down"));
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    await expectJsonError(response, 500, "Unable to save vocabulary.");
  });
});

describe("POST /api/vocabulary (save from dictionary)", () => {
  it("saves with source=DICTIONARY and dictionary IDs", async () => {
    const dictBody = vocabularyBody({
      source: "DICTIONARY",
      sourceId: undefined,
      dictionaryEntryId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      dictionarySenseId: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b",
    });
    const response = await vocabularyRoute(createJsonRequest(dictBody));
    expect(response.status).toBe(200);
    expect(routeMocks.upsertVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "DICTIONARY",
        dictionaryEntryId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        dictionarySenseId: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b",
        sourceId: undefined,
      }),
    );
  });
});
