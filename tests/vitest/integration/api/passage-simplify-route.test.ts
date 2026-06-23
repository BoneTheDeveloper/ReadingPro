import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as simplifyPassageRoute } from "@/app/api/study/passages/[id]/simplify/route";
import { passageFixture } from "../../fixtures";
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
  class PassageStudyServiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PassageStudyServiceError";
    }
  }
  return {
    getUserId: vi.fn(),
    simplifyPassageForUser: vi.fn(),
    AuthenticationRequiredError,
    PassageStudyServiceError,
  };
});

vi.mock("@/server/auth/auth-utils", () => ({
  getUserId: routeMocks.getUserId,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/server/modules/study/passage/passage-study.service", () => ({
  simplifyPassageForUser: routeMocks.simplifyPassageForUser,
  PassageStudyServiceError: routeMocks.PassageStudyServiceError,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getUserId.mockResolvedValue(userProfileFixture.id);
});

describe("POST /api/study/passages/[id]/simplify", () => {
  it("returns the simplified passage when AI simplification runs", async () => {
    const result = {
      passage: { ...passageFixture, simplifiedLevel: "A2" },
      skipped: false,
    };
    routeMocks.simplifyPassageForUser.mockResolvedValue(result);

    const response = await simplifyPassageRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: passageFixture.id }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data.skipped).toBe(false);
    expect(routeMocks.simplifyPassageForUser).toHaveBeenCalledWith(
      userProfileFixture.id,
      passageFixture.id,
    );
  });

  it("returns skipped:true when the passage is already at the simplest level", async () => {
    routeMocks.simplifyPassageForUser.mockResolvedValue({
      skipped: true as const,
      reason: "already-simplest",
    });

    const response = await simplifyPassageRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: passageFixture.id }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.skipped).toBe(true);
  });

  it("rejects unauthenticated requests with 401", async () => {
    routeMocks.getUserId.mockRejectedValue(new routeMocks.AuthenticationRequiredError());
    const response = await simplifyPassageRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: passageFixture.id }),
    });
    await expectJsonError(response, 401, "Authentication required");
  });

  it("returns 400 when service raises PassageStudyServiceError", async () => {
    routeMocks.simplifyPassageForUser.mockRejectedValue(
      new routeMocks.PassageStudyServiceError("Passage not eligible for simplification"),
    );
    const response = await simplifyPassageRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: passageFixture.id }),
    });
    await expectJsonError(response, 400, "Passage not eligible for simplification");
  });

  it("returns 500 on unexpected service failure", async () => {
    routeMocks.simplifyPassageForUser.mockRejectedValue(new Error("ai provider down"));
    const response = await simplifyPassageRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: passageFixture.id }),
    });
    await expectJsonError(response, 500, "Simplification failed — try again");
  });
});
