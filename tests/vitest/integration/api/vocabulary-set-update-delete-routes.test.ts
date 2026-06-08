import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PATCH as updateSetRoute,
  DELETE as deleteSetRoute,
} from "@/app/api/vocabulary/sets/[id]/route";
import { createJsonRequest } from "../../helpers/api";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture, vocabularySetFixture, VOCAB_SET_ID } from "../../fixtures";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  updateVocabularySet: vi.fn(),
  deleteVocabularySet: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() { super("Authentication required"); this.name = "AuthenticationRequiredError"; }
  },
}));

vi.mock("@/lib/db/vocabulary-set-queries", () => ({
  updateVocabularySet: routeMocks.updateVocabularySet,
  deleteVocabularySet: routeMocks.deleteVocabularySet,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.updateVocabularySet.mockResolvedValue(vocabularySetFixture);
  routeMocks.deleteVocabularySet.mockResolvedValue(undefined);
});

describe("PATCH /api/vocabulary/sets/[id] (rename)", () => {
  it("updates set name", async () => {
    const response = await updateSetRoute(
      createJsonRequest({ name: "Renamed Set" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(routeMocks.updateVocabularySet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      setId: VOCAB_SET_ID,
      name: "Renamed Set",
    });
  });

  it("returns 404 for non-existent set (ownership miss)", async () => {
    routeMocks.updateVocabularySet.mockRejectedValue(
      new Error("No vocabulary set found for user"),
    );
    const response = await updateSetRoute(
      createJsonRequest({ name: "New Name" }),
      { params: Promise.resolve({ id: "nonexistent-id" }) },
    );
    await expectJsonError(response, 404, "Vocabulary set not found.");
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new NextRequest("https://english-reading.test/api/vocabulary/sets/id", {
      method: "PATCH",
      body: "not json",
    });
    const response = await updateSetRoute(request, {
      params: Promise.resolve({ id: VOCAB_SET_ID }),
    });
    await expectJsonError(response, 400, "Invalid JSON payload.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await updateSetRoute(
      createJsonRequest({ name: "Renamed" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });
});

describe("DELETE /api/vocabulary/sets/[id]", () => {
  it("deletes set successfully", async () => {
    const response = await deleteSetRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.deleteVocabularySet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      setId: VOCAB_SET_ID,
    });
  });

  it("returns 404 for non-existent set (ownership miss)", async () => {
    routeMocks.deleteVocabularySet.mockRejectedValue(
      new Error("No vocabulary set found for user"),
    );
    const response = await deleteSetRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: "nonexistent-id" }) },
    );
    await expectJsonError(response, 404, "Vocabulary set not found.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await deleteSetRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 on unexpected failure", async () => {
    routeMocks.deleteVocabularySet.mockRejectedValue(new Error("db down"));
    const response = await deleteSetRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: VOCAB_SET_ID }) },
    );
    await expectJsonError(response, 500, "Failed to delete vocabulary set.");
  });
});
