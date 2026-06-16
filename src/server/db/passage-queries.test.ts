import { describe, expect, it, vi } from "vitest";
import { passageFixture } from "../../../tests/vitest/fixtures";
import { db } from "./client";
import {
  createPassage,
  createQuestion,
  deletePassage,
  getNewCards,
  getPassageWithQuestions,
  getUserPassageOverview,
  getUserPassages,
  questionDataSchema,
} from "./passage-queries";

describe("passage queries", () => {
  it("validates question data against option IDs", () => {
    const result = questionDataSchema.safeParse({
      artifactId: "00000000-0000-0000-0000-000000000000",
      questionText: "What happened?",
      options: [
        { id: "a", text: "One" },
        { id: "b", text: "Two" },
      ],
      correctOption: "c",
      sourceText: "A sentence.",
      sourceLine: 1,
      explanation: "Because.",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("correctOption must match one of the option ids");
  });

  it("fetches active passages ordered newest first", async () => {
    vi.mocked(db.passage.findMany).mockResolvedValue([{ ...passageFixture, id: "passage-1" }]);

    await expect(getUserPassages("user-1")).resolves.toEqual([{ ...passageFixture, id: "passage-1" }]);

    expect(db.passage.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns passage overview summary with zero-word fallback", async () => {
    vi.mocked(db.passage.aggregate).mockResolvedValue({
      _count: { _all: 2 },
      _sum: { wordCount: null },
      _avg: undefined,
      _min: undefined,
      _max: undefined,
    });
    vi.mocked(db.passage.findMany).mockResolvedValue([{ ...passageFixture, id: "recent-1" }]);

    await expect(getUserPassageOverview("user-1")).resolves.toEqual({
      recentPassages: [{ ...passageFixture, id: "recent-1" }],
      totalPassages: 2,
      totalWords: 0,
    });

    expect(db.passage.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        content: true,
        originalLevel: true,
        wordCount: true,
        createdAt: true,
      },
    });
  });

  it("fetches a user-owned non-deleted passage with questions", async () => {
    await getPassageWithQuestions("passage-1", "user-1");

    expect(db.passage.findUnique).toHaveBeenCalledWith({
      where: { id: "passage-1", userId: "user-1", deletedAt: null },
      include: { questions: true },
    });
  });

  it("creates and soft-deletes passages", async () => {
    const passageData = {
      title: "A title",
      content: "Passage content",
      originalLevel: "B2" as const,
      simplifiedLevel: "B1" as const,
      wordCount: 120,
      sourceType: "TEXT" as const,
      filePath: "uploads/user-1/file.txt",
    };

    await createPassage("user-1", passageData);
    await deletePassage("passage-1", "user-1");

    expect(db.passage.create).toHaveBeenCalledWith({
      data: { userId: "user-1", ...passageData },
    });
    expect(db.passage.update).toHaveBeenCalledWith({
      where: { id: "passage-1", userId: "user-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("creates valid questions and rejects invalid question payloads", async () => {
    const question = {
      passageId: "passage-1",
      artifactId: "11111111-1111-1111-1111-111111111111",
      questionText: "What is the main point?",
      options: [
        { id: "a", text: "Main point" },
        { id: "b", text: "Distractor" },
      ],
      correctOption: "a",
      sourceText: "Source text",
      sourceLine: 1,
      explanation: "The source says so.",
    };

    await createQuestion(question);
    await expect(createQuestion({ ...question, artifactId: "00000000-0000-0000-0000-00000000000x" })).rejects.toThrow(
      "Invalid question data"
    );

    expect(db.question.create).toHaveBeenCalledWith({
      data: question,
    });
  });

  it("fetches new cards for a passage with no user review", async () => {
    await getNewCards("user-1", "passage-1");

    expect(db.question.findMany).toHaveBeenCalledWith({
      where: {
        passageId: "passage-1",
        reviews: {
          none: { userId: "user-1" },
        },
      },
      take: 5,
    });
  });
});
