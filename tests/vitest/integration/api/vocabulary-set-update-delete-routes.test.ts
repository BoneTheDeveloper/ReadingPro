import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PATCH as updateSetRoute,
  DELETE as deleteSetRoute,
} from "@/app/api/vocabulary/sets/[id]/route";
import { createJsonRequest } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { userProfileFixture } from "../../fixtures";

const SET_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

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
  updateVocabularySet: vi.fn(),
  deleteVocabularySet: vi.fn(),
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
  updateVocabularySet: routeMocks.updateVocabularySet,
  deleteVocabularySet: routeMocks.deleteVocabularySet,
}));

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await response.json(), message);
}

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
      { params: Promise.resolve({ id: SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(routeMocks.updateVocabularySet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      setId: SET_ID,
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
      params: Promise.resolve({ id: SET_ID }),
    });
    await expectJsonError(response, 400, "Invalid JSON payload.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await updateSetRoute(
      createJsonRequest({ name: "Renamed" }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });
});

describe("DELETE /api/vocabulary/sets/[id]", () => {
  it("deletes set successfully", async () => {
    const response = await deleteSetRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.deleteVocabularySet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      setId: SET_ID,
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
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 on unexpected failure", async () => {
    routeMocks.deleteVocabularySet.mockRejectedValue(new Error("db down"));
    const response = await deleteSetRoute(
      new NextRequest("https://english-reading.test/api/vocabulary/sets/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: SET_ID }) },
    );
    await expectJsonError(response, 500, "Failed to delete vocabulary set.");
  });
});
