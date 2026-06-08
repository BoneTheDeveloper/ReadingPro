import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as listSetsRoute,
  POST as createSetRoute,
} from "@/app/api/vocabulary/sets/route";
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
  _count: { items: 2 },
};

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  listVocabularySets: vi.fn(),
  createManualSet: vi.fn(),
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
  listVocabularySets: routeMocks.listVocabularySets,
  createManualSet: routeMocks.createManualSet,
}));

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await response.json(), message);
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  routeMocks.listVocabularySets.mockResolvedValue([vocabularySetFixture]);
  routeMocks.createManualSet.mockResolvedValue(vocabularySetFixture);
});

describe("POST /api/vocabulary/sets (create manual set)", () => {
  it("creates a set with a name", async () => {
    const response = await createSetRoute(createJsonRequest({ name: "My Words" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(routeMocks.createManualSet).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      name: "My Words",
    });
  });

  it("rejects empty name with 400", async () => {
    const response = await createSetRoute(createJsonRequest({ name: "" }));
    await expectJsonError(response, 400, "Invalid request.");
    expect(routeMocks.createManualSet).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new NextRequest("https://english-reading.test/api/vocabulary/sets", {
      method: "POST",
      body: "not json",
    });
    const response = await createSetRoute(request);
    await expectJsonError(response, 400, "Invalid JSON payload.");
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const response = await createSetRoute(createJsonRequest({ name: "My Words" }));
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 when create fails", async () => {
    routeMocks.createManualSet.mockRejectedValue(new Error("db down"));
    const response = await createSetRoute(createJsonRequest({ name: "My Words" }));
    await expectJsonError(response, 500, "Failed to create vocabulary set.");
  });
});

describe("GET /api/vocabulary/sets (list sets)", () => {
  it("returns sets with item counts", async () => {
    const request = new NextRequest("https://english-reading.test/api/vocabulary/sets");
    const response = await listSetsRoute(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({
      id: SET_ID,
      userId: userProfileFixture.id,
      name: "My Words",
      type: "MANUAL",
      _count: { items: 2 },
    });
    expect(routeMocks.listVocabularySets).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      type: undefined,
    });
  });

  it("filters by type param", async () => {
    const request = new NextRequest(
      "https://english-reading.test/api/vocabulary/sets?type=MANUAL",
    );
    const response = await listSetsRoute(request);

    expect(response.status).toBe(200);
    expect(routeMocks.listVocabularySets).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      type: "MANUAL",
    });
  });

  it("rejects unauthenticated request with 401", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new Error("Authentication required"));
    const request = new NextRequest("https://english-reading.test/api/vocabulary/sets");
    const response = await listSetsRoute(request);
    await expectJsonError(response, 401, "Authentication required.");
  });

  it("returns 500 when list fails", async () => {
    routeMocks.listVocabularySets.mockRejectedValue(new Error("db down"));
    const request = new NextRequest("https://english-reading.test/api/vocabulary/sets");
    const response = await listSetsRoute(request);
    await expectJsonError(response, 500, "Failed to list vocabulary sets.");
  });
});
