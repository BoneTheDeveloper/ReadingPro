import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as addItemsRoute } from "@/app/api/vocabulary/sets/[id]/items/route";
import { DELETE as removeItemRoute } from "@/app/api/vocabulary/sets/[id]/items/[itemId]/route";
import { createJsonRequest } from "../../helpers/api";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture, VOCAB_SET_ID, VOCAB_ITEM_FOR_SET_ID } from "../../fixtures";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  addItemToSet: vi.fn(),
  removeItemFromSet: vi.fn(),
  verifySetOwnership: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/lib/db/vocabulary-set-queries", () => ({
  addItemToSet: routeMocks.addItemToSet,
  removeItemFromSet: routeMocks.removeItemFromSet,
  verifySetOwnership: routeMocks.verifySetOwnership,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.addItemToSet.mockResolvedValue({
    id: "set-item-001",
    vocabularySetId: VOCAB_SET_ID,
    vocabularyItemId: VOCAB_ITEM_FOR_SET_ID,
  });
  routeMocks.removeItemFromSet.mockResolvedValue(undefined);
  routeMocks.verifySetOwnership.mockResolvedValue(undefined);
});

describe("POST /api/vocabulary/sets/[id]/items (add items)", () => {
  it("adds items to set", async () => {
    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_FOR_SET_ID] }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.verifySetOwnership).toHaveBeenCalledWith(userProfileFixture.id, VOCAB_SET_ID);
    expect(routeMocks.addItemToSet).toHaveBeenCalledWith({
      setId: VOCAB_SET_ID,
      itemId: VOCAB_ITEM_FOR_SET_ID,
    });
  });

  it("is idempotent when adding duplicate items", async () => {
    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_FOR_SET_ID] }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when set belongs to another user", async () => {
    routeMocks.verifySetOwnership.mockRejectedValue(new Error("No vocabulary set found for user"));

    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_FOR_SET_ID] }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 404, "Vocabulary set not found.");
    expect(routeMocks.addItemToSet).not.toHaveBeenCalled();
  });

  it("rejects invalid item IDs with 400", async () => {
    const response = await addItemsRoute(
      createJsonRequest({ itemIds: ["not-a-uuid"] }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 400, "Invalid request.");
  });

  it("rejects empty itemIds with 400", async () => {
    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [] }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 400, "Invalid request.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));

    const response = await addItemsRoute(
      createJsonRequest({ itemIds: [VOCAB_ITEM_FOR_SET_ID] }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });
});

describe("DELETE /api/vocabulary/sets/[id]/items/[itemId] (remove item)", () => {
  it("removes item from set", async () => {
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID, itemId: VOCAB_ITEM_FOR_SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.removeItemFromSet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      setId: VOCAB_SET_ID,
      itemId: VOCAB_ITEM_FOR_SET_ID,
    });
  });

  it("returns 404 for non-existent set (ownership miss)", async () => {
    routeMocks.removeItemFromSet.mockRejectedValue(
      new Error("No vocabulary set found for user"),
    );
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID, itemId: VOCAB_ITEM_FOR_SET_ID }) },
    );
    await expectJsonError(response, 404, "Vocabulary set not found.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID, itemId: VOCAB_ITEM_FOR_SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 on unexpected failure", async () => {
    routeMocks.removeItemFromSet.mockRejectedValue(new Error("db down"));
    const response = await removeItemRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id/items/itemId", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID, itemId: VOCAB_ITEM_FOR_SET_ID }) },
    );
    await expectJsonError(response, 500, "Failed to remove item from set.");
  });
});
