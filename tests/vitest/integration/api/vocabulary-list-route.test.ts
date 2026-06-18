import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listVocabularyRoute } from "@/app/api/vocabulary/list/route";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture, vocabularyItemFixture, VOCABULARY_ITEM_ID } from "../../fixtures";

const routeMocks = vi.hoisted(() => ({
  getUserId: vi.fn(),
  listVocabularyItems: vi.fn(),
}));

vi.mock("@/server/auth/auth-utils", () => ({
  getUserId: routeMocks.getUserId,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/server/db/vocabulary-queries", () => ({
  listVocabularyItems: routeMocks.listVocabularyItems,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getUserId.mockResolvedValue(userProfileFixture.id);
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
    routeMocks.getUserId.mockRejectedValue(new Error("Authentication required"));
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
