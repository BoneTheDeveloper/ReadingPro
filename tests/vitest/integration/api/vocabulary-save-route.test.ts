import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as vocabularyRoute } from "@/app/api/vocabulary/route";
import { createJsonRequest } from "../../helpers/api";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { passageFixture, userProfileFixture, vocabularyBody, vocabularyItemFixture } from "../../fixtures";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  saveVocabularyItem: vi.fn(),
}));

vi.mock("@/server/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/server/modules/vocabulary/vocabulary.service", () => ({
  saveVocabularyItem: routeMocks.saveVocabularyItem,
  VocabularyServiceError: class VocabularyServiceError extends Error {
    constructor(message: string) { super(message); this.name = "VocabularyServiceError"; }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.saveVocabularyItem.mockResolvedValue(vocabularyItemFixture);
});

describe("POST /api/vocabulary (save from translate)", () => {
  it("creates item via saveVocabularyItem", async () => {
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(routeMocks.saveVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userProfileFixture.id,
        selectedText: "ephemeral",
        translation: "hap dan",
        source: "TRANSLATE",
        sourceId: passageFixture.id,
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
    expect(routeMocks.saveVocabularyItem).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 404 when source passage not found", async () => {
    const { VocabularyServiceError } = await import("@/server/modules/vocabulary/vocabulary.service");
    routeMocks.saveVocabularyItem.mockRejectedValue(new VocabularyServiceError("Source not found."));
    const response = await vocabularyRoute(createJsonRequest(vocabularyBody()));
    await expectJsonError(response, 404, "Source not found.");
  });

  it("returns 500 when save fails", async () => {
    routeMocks.saveVocabularyItem.mockRejectedValue(new Error("db down"));
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
    expect(routeMocks.saveVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "DICTIONARY",
        dictionaryEntryId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        dictionarySenseId: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b",
      }),
    );
  });
});
