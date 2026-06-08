import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as uploadFileRoute } from "@/app/api/upload/route";
import { POST as uploadTextRoute } from "@/app/api/upload/text/route";
import { uploadResponseSchema } from "@/lib/upload/shared/upload-response-schema";
import { userProfileFixture } from "../../fixtures";
import { createFile, createJsonRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }

  class UploadWorkflowError extends Error {
    constructor(message: string, readonly status = 400) {
      super(message);
      this.name = "UploadWorkflowError";
    }
  }

  return {
    getAuthenticatedUser: vi.fn(),
    processFileUpload: vi.fn(),
    analyzeAndPersistContent: vi.fn(),
    AuthenticationRequiredError,
    UploadWorkflowError,
  };
});

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/features/upload/upload-workflow", () => ({
  processFileUpload: routeMocks.processFileUpload,
  UploadWorkflowError: routeMocks.UploadWorkflowError,
}));

vi.mock("@/features/upload/content-analysis-service", () => ({
  analyzeAndPersistContent: routeMocks.analyzeAndPersistContent,
}));

function createUploadRequest(file: File | null) {
  return {
    formData: vi.fn(async () => ({
      get: vi.fn(() => file),
    })),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("upload API contracts", () => {
  it("returns 401 for unauthenticated file uploads before processing the file", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const response = await uploadFileRoute(
      createUploadRequest(createFile("story.txt", "A useful story for reading practice.")),
    );

    expect(response.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(response, uploadResponseSchema),
      "Authentication required.",
    );
    expect(routeMocks.processFileUpload).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated text uploads after JSON validation", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const response = await uploadTextRoute(
      createJsonRequest({
        text: "This is a sufficiently long text passage for upload route testing with enough characters.",
      }),
    );

    expect(response.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(response, uploadResponseSchema),
      "Authentication required.",
    );
    expect(routeMocks.analyzeAndPersistContent).not.toHaveBeenCalled();
  });
});
