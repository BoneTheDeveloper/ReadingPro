import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as reviewVocabularyRoute } from "@/app/api/vocabulary/[id]/review/route";
import {
  VOCABULARY_ITEM_ID,
  vocabularyItemFixture,
} from "../../fixtures";
import { createJsonRequest } from "../../helpers/api";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture } from "../../fixtures/user";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }
  class OwnershipMissError extends Error {
    constructor() {
      super("No vocabulary item found for user");
      this.name = "OwnershipMissError";
    }
  }
  return {
    getUserId: vi.fn(),
    reviewVocabularyItem: vi.fn(),
    AuthenticationRequiredError,
    OwnershipMissError,
  };
});

vi.mock("@/server/auth/auth-utils", () => ({
  getUserId: routeMocks.getUserId,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/server/db/vocabulary-queries", () => ({
  reviewVocabularyItem: routeMocks.reviewVocabularyItem,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getUserId.mockResolvedValue(userProfileFixture.id);
  routeMocks.reviewVocabularyItem.mockResolvedValue(vocabularyItemFixture);
});

describe("POST /api/vocabulary/[id]/review", () => {
  it("returns the updated item on a correct review", async () => {
    const updated = { ...vocabularyItemFixture, status: "LEARNING" };
    routeMocks.reviewVocabularyItem.mockResolvedValue(updated);

    const request = createJsonRequest({ isCorrect: true });
    const response = await reviewVocabularyRoute(request, {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data.status).toBe("LEARNING");
    expect(routeMocks.reviewVocabularyItem).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      itemId: VOCABULARY_ITEM_ID,
      isCorrect: true,
    });
  });

  it("returns the updated item on an incorrect review", async () => {
    const updated = { ...vocabularyItemFixture, status: "LEARNING" };
    routeMocks.reviewVocabularyItem.mockResolvedValue(updated);

    const request = createJsonRequest({ isCorrect: false });
    const response = await reviewVocabularyRoute(request, {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });

    expect(response.status).toBe(200);
    expect(routeMocks.reviewVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: false }),
    );
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new NextRequest(
      `https://english-reading.test/api/vocabulary/${VOCABULARY_ITEM_ID}/review`,
      {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not json {{{",
      },
    );
    const response = await reviewVocabularyRoute(request, {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 400, "Invalid JSON payload.");
    expect(routeMocks.reviewVocabularyItem).not.toHaveBeenCalled();
  });

  it("rejects missing isCorrect field with 400", async () => {
    const response = await reviewVocabularyRoute(createJsonRequest({}), {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 400, "Invalid request.");
    expect(routeMocks.reviewVocabularyItem).not.toHaveBeenCalled();
  });

  it("rejects non-boolean isCorrect with 400", async () => {
    const response = await reviewVocabularyRoute(createJsonRequest({ isCorrect: "yes" }), {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 400, "Invalid request.");
    expect(routeMocks.reviewVocabularyItem).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401", async () => {
    routeMocks.getUserId.mockRejectedValue(new routeMocks.AuthenticationRequiredError());
    const response = await reviewVocabularyRoute(createJsonRequest({ isCorrect: true }), {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 404 when item is not owned by user", async () => {
    routeMocks.reviewVocabularyItem.mockRejectedValue(new routeMocks.OwnershipMissError());
    const response = await reviewVocabularyRoute(createJsonRequest({ isCorrect: true }), {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 404, "Vocabulary item not found.");
  });

  it("returns 500 on unexpected service failure", async () => {
    routeMocks.reviewVocabularyItem.mockRejectedValue(new Error("db down"));
    const response = await reviewVocabularyRoute(createJsonRequest({ isCorrect: true }), {
      params: Promise.resolve({ id: VOCABULARY_ITEM_ID }),
    });
    await expectJsonError(response, 500, "Failed to review vocabulary item.");
  });
});
