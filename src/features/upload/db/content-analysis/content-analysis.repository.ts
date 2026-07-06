import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CEFRLevel } from "@/types/cefr";

type SourceType = "TEXT" | "PDF";

export interface QuestionCreateInput {
  questionText: string;
  options: string;
  correctOption: string;
  sourceText: string;
  sourceLine: number;
  explanation: string;
  questionType: string;
  difficulty: number;
}

export async function createPassageWithArtifacts(input: {
  userId: string;
  title: string;
  text: string;
  simplifiedContent: string | null;
  originalLevel: CEFRLevel;
  simplifiedLevel: CEFRLevel | null;
  wordCount: number;
  sourceType: SourceType;
  filePath?: string;
  artifactId: string;
  questions: QuestionCreateInput[];
}) {
  return prisma.passage.create({
    data: {
      userId: input.userId,
      title: input.title,
      content: input.text,
      simplifiedContent: input.simplifiedContent,
      originalLevel: input.originalLevel,
      simplifiedLevel: input.simplifiedLevel,
      wordCount: input.wordCount,
      sourceType: input.sourceType,
      filePath: input.filePath,
      ...(input.questions.length > 0
        ? {
            studioArtifacts: {
              create: {
                id: input.artifactId,
                userId: input.userId,
                type: "quiz",
                title: "Initial Quiz",
                status: "done",
              },
            },
            questions: {
              create: input.questions.map((q) => ({
                ...q,
                artifactId: input.artifactId,
              })) as Prisma.QuestionUncheckedCreateWithoutPassageInput[],
            },
          }
        : {}),
    },
  });
}
