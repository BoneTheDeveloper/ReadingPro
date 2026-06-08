import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listVocabularyRoute } from "@/app/api/vocabulary/list/route";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { userProfileFixture } from "../../fixtures";

const VOCABULARY_ITEM_ID = "550e8400-e29b-41d4-a716-446655440001";

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
  listVocabularyItems: vi.fn(),
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
  listVocabularyItems: routeMocks.listVocabularyItems,
}));

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await response.json(), message);
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.listVocabularyItems.mockResolvedValue({
    items: [vocabularyItemFixture],
    total: 1,
  });
});

describe("GET /api/vocabulary/list", () => {
  it("returns paginated items", async () => {
    const request = new NextRequest("https://english-reading.test/api/vocabulary/list");
    const response = await listVocabularyRoute(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.items[0].id).toBe(VOCABULARY_ITEM_ID);
    expect(routeMocks.listVocabularyItems).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      status: undefined,
      search: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("filters by status and search params", async () => {
    routeMocks.listVocabularyItems.mockResolvedValue({ items: [], total: 0 });

    const request = new NextRequest(
      "https://english-reading.test/api/vocabulary/list?status=LEARNING&search=ephemeral&page=2&pageSize=10",
    );
    const response = await listVocabularyRoute(request);

    expect(response.status).toBe(200);
    expect(routeMocks.listVocabularyItems).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      status: "LEARNING",
      search: "ephemeral",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const request = new NextRequest("https://english-reading.test/api/vocabulary/list");
    const response = await listVocabularyRoute(request);
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 when list query fails", async () => {
    routeMocks.listVocabularyItems.mockRejectedValue(new Error("db down"));
    const request = new NextRequest("https://english-reading.test/api/vocabulary/list");
    const response = await listVocabularyRoute(request);
    await expectJsonError(response, 500, "Failed to list vocabulary items.");
  });
});
