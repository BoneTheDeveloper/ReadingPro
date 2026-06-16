import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createModuleLogger } from "../../mocks/logger";

const authUtils = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
}));

const studyShared = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
}));

const analysisService = vi.hoisted(() => ({
  analyzeAndPersistContent: vi.fn(),
}));

const passageQueries = vi.hoisted(() => ({
  deletePassage: vi.fn(),
}));

const passageCreateService = vi.hoisted(() => ({
  createPassageRecord: vi.fn(),
}));

const studyService = vi.hoisted(() => {
  class PassageStudyServiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PassageStudyServiceError";
    }
  }

  return {
    PassageStudyServiceError,
    generateQuestionsForPassage: vi.fn(),
    simplifyPassageForUser: vi.fn(),
  };
});

vi.mock("@/lib/auth/auth-utils", () => authUtils);
vi.mock("@/features/study/actions/study-shared", () => studyShared);
vi.mock("@/lib/upload/content-analysis/content-analysis.service", () => analysisService);
vi.mock("@/lib/db/passage-queries", () => passageQueries);
vi.mock("@/lib/upload/passage-create/passage-create.service", () => passageCreateService);
vi.mock("@/lib/study/passage/passage-study.service", () => studyService);

const enoughText = "This is enough text for a server action upload path because it is longer than fifty characters.";

describe("server actions", () => {
  beforeEach(() => {
    authUtils.getAuthenticatedUser.mockResolvedValue({ id: "user_1" });
    studyShared.getAuthenticatedUser.mockResolvedValue({ id: "user_1" });
    passageCreateService.createPassageRecord.mockReset();
  });

  it("analyzeContentAction validates short text before authentication", async () => {
    const { analyzeContentAction } = await import("@/features/upload/actions/analyze-content-action");
    const formData = new FormData();
    formData.set("text", "too short");

    await expect(analyzeContentAction(formData)).resolves.toEqual({ error: "Text too short" });

    expect(authUtils.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(Sentry.withServerActionInstrumentation).toHaveBeenCalledWith(
      "analyzeContent",
      expect.objectContaining({ headers: expect.any(Headers) }),
      expect.any(Function),
    );
  });

  it("analyzeContentAction persists authenticated text submissions", async () => {
    analysisService.analyzeAndPersistContent.mockResolvedValueOnce({
      passageId: "passage_1",
      originalLevel: "A2",
      simplifiedLevel: null,
      questionCount: 0,
    });
    const { analyzeContentAction } = await import("@/features/upload/actions/analyze-content-action");
    const formData = new FormData();
    formData.set("text", enoughText);
    formData.set("title", "Action title");

    await expect(analyzeContentAction(formData)).resolves.toEqual({
      passageId: "passage_1",
      originalLevel: "A2",
      simplifiedLevel: null,
      questionCount: 0,
    });
    expect(analysisService.analyzeAndPersistContent).toHaveBeenCalledWith({
      userId: "user_1",
      text: enoughText,
      title: "Action title",
      sourceType: "TEXT",
    });
  });

  it("studyUploadAction stores a passage and returns a stable action shape", async () => {
    passageCreateService.createPassageRecord.mockResolvedValueOnce({
      id: "passage_1",
      title: "Study",
      content: enoughText,
      simplifiedContent: null,
      originalLevel: "A2",
      simplifiedLevel: null,
      wordCount: 17,
      createdAt: new Date("2026-05-21T00:00:00.000Z").getTime(),
      sourceType: "TEXT",
    });
    const { studyUploadAction } = await import("@/features/study/actions/study-upload-action");

    await expect(studyUploadAction({ text: enoughText, title: "Study" })).resolves.toEqual({
      passage: {
        id: "passage_1",
        title: "Study",
        content: enoughText,
        simplifiedContent: null,
        originalLevel: "A2",
        simplifiedLevel: null,
        wordCount: 17,
        createdAt: new Date("2026-05-21T00:00:00.000Z").getTime(),
        sourceType: "TEXT",
      },
    });
    expect(passageCreateService.createPassageRecord).toHaveBeenCalledWith({
      userId: "user_1",
      text: enoughText,
      title: "Study",
      sourceType: "TEXT",
    });
    expect(createModuleLogger).toHaveBeenCalledWith("actions:study-upload");
  });

  it("studyUploadAction returns validation errors before DB writes", async () => {
    const { studyUploadAction } = await import("@/features/study/actions/study-upload-action");

    await expect(studyUploadAction({ text: "short", title: "Study" })).resolves.toEqual({
      error: "Text too short (minimum 50 characters)",
    });
    expect(passageCreateService.createPassageRecord).not.toHaveBeenCalled();
  });

  it("studyDeletePassageAction deletes only for the authenticated user", async () => {
    passageQueries.deletePassage.mockResolvedValueOnce({});
    const { studyDeletePassageAction } = await import("@/features/study/actions/study-delete-passage-action");

    await expect(studyDeletePassageAction({ passageId: "passage_1" })).resolves.toEqual({ success: true });

    expect(passageQueries.deletePassage).toHaveBeenCalledWith("passage_1", "user_1");
  });

  it("studySimplifyAction returns skipped and error service results", async () => {
    studyService.simplifyPassageForUser.mockResolvedValueOnce({
      skipped: true,
      reason: "Text is already A2 level",
    });
    const { studySimplifyAction } = await import("@/features/study/actions/study-simplify-action");

    await expect(studySimplifyAction({ passageId: "passage_1" })).resolves.toEqual({
      skipped: true,
      reason: "Text is already A2 level",
    });

    studyService.simplifyPassageForUser.mockRejectedValueOnce(
      new studyService.PassageStudyServiceError("Simplification failed — try again"),
    );

    await expect(studySimplifyAction({ passageId: "passage_1" })).resolves.toEqual({
      error: "Simplification failed — try again",
    });
  });
});
