import * as Sentry from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { analyzeAndPersistContent } from "@/features/upload/content-analysis-service";
import { db } from "../../mocks/db";
import { generateObject, mockGenerateObjectOnce } from "../../mocks/ai";

const complexText = Array.from(
  { length: 8 },
  () => "Sophisticated internationalization requires comprehensive collaboration, interpretation, and accountability across institutions.",
).join(" ");

const generatedQuestion = {
  questionText: "What does collaboration require?",
  options: [
    { id: "A", text: "Accountability" },
    { id: "B", text: "Isolation" },
  ],
  correctAnswer: "A",
  sourceText: "collaboration",
  sourceLine: 1,
  explanation: "The passage mentions accountability across institutions.",
  questionType: "MULTIPLE_CHOICE" as const,
  difficulty: 2,
};

describe("analyzeAndPersistContent", () => {
  it("detects level, simplifies, stores questions, and returns the persisted summary", async () => {
    mockGenerateObjectOnce({
      simplifiedText: "People work together and stay responsible.",
      changes: ["Reduced vocabulary."],
      retainedKeyTerms: ["accountability"],
    });
    mockGenerateObjectOnce({
      questions: [generatedQuestion],
      wordCount: 9,
      estimatedTime: 1,
    });
    db.passage.create.mockResolvedValueOnce({ id: "passage_1" });

    const result = await analyzeAndPersistContent({
      userId: "user_1",
      text: complexText,
      title: "Institutions",
      sourceType: "TEXT",
    });

    expect(result).toEqual({
      passageId: "passage_1",
      originalLevel: "C1",
      simplifiedLevel: "B2",
      questionCount: 1,
    });
    expect(db.passage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        title: "Institutions",
        content: complexText,
        simplifiedContent: "People work together and stay responsible.",
        originalLevel: "C1",
        simplifiedLevel: "B2",
        sourceType: "TEXT",
        questions: {
          create: [
            expect.objectContaining({
              questionText: generatedQuestion.questionText,
              options: JSON.stringify(generatedQuestion.options),
              correctOption: "A",
            }),
          ],
        },
      }),
    });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "analysis" }),
    );
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: "db:passage-create" }),
      expect.any(Function),
    );
  });

  it("saves the passage without questions when AI question generation returns null", async () => {
    mockGenerateObjectOnce({
      simplifiedText: "People work together.",
      changes: [],
      retainedKeyTerms: [],
    });
    generateObject.mockResolvedValueOnce({ object: null });
    db.passage.create.mockResolvedValueOnce({ id: "passage_no_questions" });

    await expect(
      analyzeAndPersistContent({
        userId: "user_1",
        text: complexText,
        title: "No questions",
        sourceType: "PDF",
        fileUrl: "https://cdn.test/file.pdf",
      }),
    ).resolves.toEqual({
      passageId: "passage_no_questions",
      originalLevel: "C1",
      simplifiedLevel: "B2",
      questionCount: 0,
    });

    expect(db.passage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fileUrl: "https://cdn.test/file.pdf",
        questions: { create: [] },
      }),
    });
  });

  it("propagates DB failures after adding the DB breadcrumb", async () => {
    mockGenerateObjectOnce({ questions: [], wordCount: 0, estimatedTime: 0 });
    db.passage.create.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(
      analyzeAndPersistContent({
        userId: "user_1",
        text: "Short simple words make this content long enough for the service test case to pass validation.",
        title: "DB failure",
        sourceType: "TEXT",
      }),
    ).rejects.toThrow("db unavailable");

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "db", message: "Creating passage with questions" }),
    );
  });
});
