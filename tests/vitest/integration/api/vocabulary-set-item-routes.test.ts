import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as addItemsRoute } from "@/app/api/vocabulary/sets/[id]/items/route";
import { DELETE as removeItemRoute } from "@/app/api/vocabulary/sets/[id]/items/[itemId]/route";
import { createJsonRequest } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { userProfileFixture } from "../../fixtures";
import { db } from "../../mocks/db";

const SET_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const VOCAB_ITEM_ID = "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b";

const vocabularySetFixture = {
  id: SET_ID,
  userId: userProfileFixture.id,
  name: "My Words",
  type: "MANUAL" as const,
  periodStart: null,
  periodEnd: null,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-01T00:00:00.000Z"),
};

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  addItemToSet: vi.fn(),
  removeItemFromSet: vi.fn(),
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

vi.mock("@/lib/db/vocabulary-set-queries", () => ({
  addItemToSet: routeMocks.addItemToSet,
  removeItemFromSet: routeMocks.removeItemFromSet,
}));

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await response.json(), message);
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.addItemToSet.mockResolvedValue({
    id: "set-item-001",
    vocabularySetId: SET_ID,
    vocabularyItemId: VOCAB_ITEM_ID,
  });
  routeMocks.removeItemFromSet.mockResolvedValue(undefined);
});

describe("POST /api/vocabulary/sets/[id]/items (add items)", () => {
  it("adds items to set", async () => {
    db.vocabularySet.findUniqueOrThrow.mockResolvedValue(vocabularySetFixture);

    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_ID] }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.addItemToSet).toHaveBeenCalledWith({
      setId: SET_ID,
      itemId: VOCAB_ITEM_ID,
    });
  });

  it("is idempotent when adding duplicate items", async () => {
    db.vocabularySet.findUniqueOrThrow.mockResolvedValue(vocabularySetFixture);

    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_ID] }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when set belongs to another user", async () => {
    db.vocabularySet.findUniqueOrThrow.mockResolvedValue({
      ...vocabularySetFixture,
      userId: "other-user",
    });

    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_ID] }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 404, "Vocabulary set not found.");
    expect(routeMocks.addItemToSet).not.toHaveBeenCalled();
  });

  it("rejects invalid item IDs with 400", async () => {
    const response = await addItemsRoute(
      createJsonRequest({ itemIds: ["not-a-uuid"] }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 400, "Invalid request.");
  });

  it("rejects empty itemIds with 400", async () => {
    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [] }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 400, "Invalid request.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    db.vocabularySet.findUniqueOrThrow.mockResolvedValue(vocabularySetFixture);

    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_ID] }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });
});

describe("DELETE /api/vocabulary/sets/[id]/items/[itemId] (remove item)", () => {
  it("removes item from set", async () => {
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: SET_ID, itemId: VOCAB_ITEM_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.removeItemFromSet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      setId: SET_ID,
      itemId: VOCAB_ITEM_ID,
    });
  });

  it("returns 404 for non-existent set (ownership miss)", async () => {
    routeMocks.removeItemFromSet.mockRejectedValue(
      new Error("No vocabulary set found for user"),
    );
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: SET_ID, itemId: VOCAB_ITEM_ID }) },
    );
    await expectJsonError(response, 404, "Vocabulary set not found.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: SET_ID, itemId: VOCAB_ITEM_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 on unexpected failure", async () => {
    routeMocks.removeItemFromSet.mockRejectedValue(new Error("db down"));
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: SET_ID, itemId: VOCAB_ITEM_ID }) },
    );
    await expectJsonError(response, 500, "Failed to remove item from set.");
  });
});
