import * as Sentry from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import {
  generateQuestionsForPassage,
  PassageStudyServiceError,
  simplifyPassageForUser,
} from "@/features/study/services/passage-study-service";
import { db } from "../mocks/db";
import { mockGenerateObjectOnce } from "../mocks/ai";

const passage = {
  id: "passage_1",
  userId: "user_1",
  title: "Complex passage",
  content: "Sophisticated readers evaluate assumptions and synthesize implications across paragraphs.",
  simplifiedContent: null,
  originalLevel: "B2",
  simplifiedLevel: null,
};

const validQuestion = {
  questionText: "What do readers evaluate?",
  options: [
    { id: "A", text: "Assumptions" },
    { id: "B", text: "Weather" },
  ],
  correctAnswer: "A",
  sourceText: "evaluate assumptions",
  sourceLine: 1,
  explanation: "The passage names assumptions.",
  questionType: "MULTIPLE_CHOICE" as const,
  difficulty: 2,
};

describe("passage study service", () => {
  it("returns not found for passages outside the user's ownership", async () => {
    db.passage.findUnique.mockResolvedValueOnce(null);

    await expect(simplifyPassageForUser("user_1", "missing")).rejects.toThrow(
      new PassageStudyServiceError("Passage not found"),
    );
  });

  it("skips simplification when the CEFR level is already simple", async () => {
    db.passage.findUnique.mockResolvedValueOnce({ ...passage, originalLevel: "A2" });

    await expect(simplifyPassageForUser("user_1", "passage_1")).resolves.toEqual({
      skipped: true,
      reason: "Text is already A2 level",
    });
    expect(db.passage.update).not.toHaveBeenCalled();
  });

  it("persists successful simplification at the target level", async () => {
    db.passage.findUnique.mockResolvedValueOnce(passage);
    mockGenerateObjectOnce({
      simplifiedText: "Readers think about ideas in the text.",
      changes: ["Simplified vocabulary."],
      retainedKeyTerms: ["readers"],
    });
    db.passage.update.mockResolvedValueOnce({});

    await expect(simplifyPassageForUser("user_1", "passage_1")).resolves.toEqual({
      simplifiedContent: "Readers think about ideas in the text.",
      simplifiedLevel: "B1",
    });
    expect(db.passage.update).toHaveBeenCalledWith({
      where: { id: "passage_1", userId: "user_1" },
      data: {
        simplifiedContent: "Readers think about ideas in the text.",
        simplifiedLevel: "B1",
      },
    });
  });

  it("filters invalid generated questions, replaces stored questions, and maps pending ids", async () => {
    db.passage.findUnique.mockResolvedValueOnce({ ...passage, simplifiedContent: "Simpler passage text." });
    mockGenerateObjectOnce({
      questions: [
        validQuestion,
        { ...validQuestion, correctAnswer: "Z", questionText: "Invalid answer" },
      ],
      wordCount: 4,
      estimatedTime: 1,
    });

    const result = await generateQuestionsForPassage("user_1", "passage_1");

    expect(result).toEqual([
      expect.objectContaining({
        id: "pending-0",
        number: 1,
        questionText: validQuestion.questionText,
        correctAnswer: "A",
      }),
    ]);
    expect(db.question.deleteMany).toHaveBeenCalledWith({ where: { passageId: "passage_1" } });
    expect(db.question.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          passageId: "passage_1",
          questionText: validQuestion.questionText,
          options: JSON.stringify(validQuestion.options),
        }),
      ],
    });
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: "db:questions-replace" }),
      expect.any(Function),
    );
  });

  it("errors when all generated questions fail validation", async () => {
    db.passage.findUnique.mockResolvedValueOnce(passage);
    mockGenerateObjectOnce({
      questions: [{ ...validQuestion, correctAnswer: "Z" }],
      wordCount: 4,
      estimatedTime: 1,
    });

    await expect(generateQuestionsForPassage("user_1", "passage_1")).rejects.toThrow(
      "All generated questions failed validation",
    );
  });
});
