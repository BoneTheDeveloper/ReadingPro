import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as deleteVocabularyRoute } from "@/app/api/vocabulary/[id]/route";
import { PATCH as updateStatusRoute } from "@/app/api/vocabulary/[id]/status/route";
import { createJsonRequest } from "../../helpers/api";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture, vocabularyItemFixture, VOCABULARY_ITEM_ID } from "../../fixtures";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  updateVocabularyStatus: vi.fn(),
  deleteVocabularyItem: vi.fn(),
}));

vi.mock("@/server/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/server/db/vocabulary-queries", () => ({
  updateVocabularyStatus: routeMocks.updateVocabularyStatus,
  deleteVocabularyItem: routeMocks.deleteVocabularyItem,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.updateVocabularyStatus.mockResolvedValue(vocabularyItemFixture);
  routeMocks.deleteVocabularyItem.mockResolvedValue(undefined);
});

describe("PATCH /api/vocabulary/[id]/status", () => {
  it("updates status to LEARNING", async () => {
    const updated = { ...vocabularyItemFixture, status: "LEARNING" };
    routeMocks.updateVocabularyStatus.mockResolvedValue(updated);

    const response = await updateStatusRoute(
      createJsonRequest({ status: "LEARNING" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(routeMocks.updateVocabularyStatus).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      itemId: VOCABULARY_ITEM_ID,
      status: "LEARNING",
    });
  });

  it("rejects invalid status with 400", async () => {
    const response = await updateStatusRoute(
      createJsonRequest({ status: "INVALID" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    await expectJsonError(response, 400, "Invalid request.");
    expect(routeMocks.updateVocabularyStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new NextRequest("https://english-reading.test/api/vocabulary/id/status", {
      method: "PATCH",
      body: "not json",
    });
    const response = await updateStatusRoute(request, {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 400, "Invalid JSON payload.");
  });

  it("returns 404 for non-existent item (ownership miss)", async () => {
    routeMocks.updateVocabularyStatus.mockRejectedValue(
      new Error("No vocabulary item found for user"),
    );
    const response = await updateStatusRoute(
      createJsonRequest({ status: "MASTERED" }),
      { params: Promise.resolve({ id: "nonexistent-id" }) },
    );
    await expectJsonError(response, 404, "Vocabulary item not found.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await updateStatusRoute(
      createJsonRequest({ status: "LEARNING" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 on unexpected failure", async () => {
    routeMocks.updateVocabularyStatus.mockRejectedValue(new Error("db down"));
    const response = await updateStatusRoute(
      createJsonRequest({ status: "LEARNING" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    await expectJsonError(response, 500, "Failed to update vocabulary status.");
  });
});

describe("DELETE /api/vocabulary/[id]", () => {
  it("deletes item successfully", async () => {
    const response = await deleteVocabularyRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.deleteVocabularyItem).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      itemId: VOCABULARY_ITEM_ID,
    });
  });

  it("returns 404 for non-existent item (ownership miss)", async () => {
    routeMocks.deleteVocabularyItem.mockRejectedValue(
      new Error("No vocabulary item found for user"),
    );
    const response = await deleteVocabularyRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: "nonexistent-id" }) },
    );
    await expectJsonError(response, 404, "Vocabulary item not found.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await deleteVocabularyRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 on unexpected failure", async () => {
    routeMocks.deleteVocabularyItem.mockRejectedValue(new Error("db down"));
    const response = await deleteVocabularyRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCABULARY_ITEM_ID }) },
    );
    await expectJsonError(response, 500, "Failed to delete vocabulary item.");
  });
});
