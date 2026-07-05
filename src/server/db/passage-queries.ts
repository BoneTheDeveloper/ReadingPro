import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { CEFRLevel } from "@/contracts/domain/cefr";
import { db } from "@/server/lib/db";
export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const questionDataSchema = z
  .object({
    artifactId: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
    questionText: z.string(),
    options: z.array(questionOptionSchema).min(2),
    correctOption: z.string(),
    sourceText: z.string(),
    sourceLine: z.number().int().positive(),
    explanation: z.string(),
  })
  .refine((q) => q.options.some((opt) => opt.id === q.correctOption), {
    message: "correctOption must match one of the option ids",
    path: ["correctOption"],
  });

export async function getUserPassages(userId: string) {
  return db.passage.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserPassageOverview(userId: string) {
  const where = { userId, deletedAt: null };

  const [summary, recentPassages] = await Promise.all([
    db.passage.aggregate({
      where,
      _count: { _all: true },
      _sum: { wordCount: true },
    }),
    db.passage.findMany({
      where,
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
    }),
  ]);

  return {
    recentPassages,
    totalPassages: summary._count._all,
    totalWords: summary._sum.wordCount ?? 0,
  };
}

export async function getPassageWithQuestions(
  passageId: string,
  userId: string,
) {
  return db.passage.findUnique({
    where: { id: passageId, userId, deletedAt: null },
    include: { questions: true },
  });
}

export async function createPassage(
  userId: string,
  data: {
    title: string;
    content: string;
    simplifiedContent?: string;
    originalLevel?: CEFRLevel;
    simplifiedLevel?: CEFRLevel;
    wordCount: number;
    sourceType: "TEXT" | "PDF";
    filePath?: string;
  },
) {
  return db.passage.create({ data: { userId, ...data } });
}

export async function createQuestion(data: {
  passageId: string;
  artifactId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOption: string;
  sourceText: string;
  sourceLine: number;
  explanation: string;
}) {
  const result = questionDataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid question data: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return db.question.create({
    data: data as unknown as Prisma.QuestionUncheckedCreateInput,
  });
}

export async function deletePassage(passageId: string, userId: string) {
  return db.passage.update({
    where: { id: passageId, userId },
    data: { deletedAt: new Date() },
  });
}

export async function getNewCards(userId: string, passageId: string) {
  return db.question.findMany({
    where: {
      passageId,
      reviews: {
        none: { userId },
      },
    },
    take: 5,
  });
}
