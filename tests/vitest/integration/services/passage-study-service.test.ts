import * as Sentry from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import {
  generateQuestionsForPassage,
  PassageStudyServiceError,
  simplifyPassageForUser,
} from "@/server/modules/study/passage/passage-study.service";
import { db } from "../../mocks/db";
import { mockGenerateObjectOnce } from "../../mocks/ai";

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

const artifactId = "11111111-1111-1111-1111-111111111111";

function mockCreatedArtifact(overrides = {}) {
  const now = new Date("2026-06-16T12:00:00.000Z");
  return {
    id: artifactId,
    type: "quiz",
    passageId: "passage_1",
    userId: "user_1",
    title: "Complex passage",
    status: "done",
    createdAt: now,
    updatedAt: now,
    quizResult: null,
    ...overrides,
  };
}

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

  it("creates artifact + questions atomically, filters invalid questions, and maps pending ids", async () => {
    db.passage.findUnique.mockResolvedValueOnce({ ...passage, simplifiedContent: "Simpler passage text." });
    // Idempotency guard: no existing artifact
    db.studioArtifact.findUnique.mockResolvedValueOnce(null);
    mockGenerateObjectOnce({
      questions: [
        validQuestion,
        { ...validQuestion, correctAnswer: "Z", questionText: "Invalid answer" },
      ],
      wordCount: 4,
      estimatedTime: 1,
    });
    db.studioArtifact.create.mockResolvedValueOnce(mockCreatedArtifact());
    db.question.createMany.mockResolvedValueOnce({ count: 1 });

    const { artifact, questions } = await generateQuestionsForPassage("user_1", "passage_1", artifactId);

    expect(artifact).toMatchObject({ id: artifactId, status: "done", type: "quiz" });
    expect(questions).toEqual([
      expect.objectContaining({
        id: "pending-0",
        number: 1,
        questionText: validQuestion.questionText,
        correctAnswer: "A",
      }),
    ]);
    expect(db.studioArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: artifactId,
          passageId: "passage_1",
          status: "done",
          type: "quiz",
        }),
      }),
    );
    expect(db.question.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          passageId: "passage_1",
          artifactId,
          questionText: validQuestion.questionText,
          options: validQuestion.options,
        }),
      ],
    });
    expect(db.question.deleteMany).not.toHaveBeenCalled();
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: "db:artifact-and-questions-create" }),
      expect.any(Function),
    );
  });

  it("returns existing artifact + questions for a duplicate artifactId (idempotency)", async () => {
    db.passage.findUnique.mockResolvedValueOnce(passage);
    const existingQuestion = {
      id: "q-existing",
      questionText: "Existing?",
      options: validQuestion.options,
      correctOption: "A",
      sourceText: "existing",
      sourceLine: 1,
      explanation: "existing explanation",
      questionType: "MULTIPLE_CHOICE",
      difficulty: 2,
      createdAt: new Date(),
    };
    db.studioArtifact.findUnique.mockResolvedValueOnce({
      ...mockCreatedArtifact(),
      questions: [existingQuestion],
    });

    const { artifact, questions } = await generateQuestionsForPassage("user_1", "passage_1", artifactId);

    expect(artifact).toMatchObject({ id: artifactId, status: "done" });
    expect(questions[0]).toMatchObject({ id: "q-existing", correctAnswer: "A" });
    // LLM and DB writes should NOT have been called
    expect(db.studioArtifact.create).not.toHaveBeenCalled();
    expect(db.question.createMany).not.toHaveBeenCalled();
  });

  it("errors when all generated questions fail validation (nothing persisted)", async () => {
    db.passage.findUnique.mockResolvedValueOnce(passage);
    db.studioArtifact.findUnique.mockResolvedValueOnce(null);
    mockGenerateObjectOnce({
      questions: [{ ...validQuestion, correctAnswer: "Z" }],
      wordCount: 4,
      estimatedTime: 1,
    });

    await expect(generateQuestionsForPassage("user_1", "passage_1", artifactId)).rejects.toThrow(
      "All generated questions failed validation",
    );
    expect(db.studioArtifact.create).not.toHaveBeenCalled();
    expect(db.question.createMany).not.toHaveBeenCalled();
  });
});
