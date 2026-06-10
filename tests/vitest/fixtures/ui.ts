import { generatedQuestionsFixture, passageFixture } from "./article";
import type { PassageData, QuestionData, StudioResult, StudioResultType, StudioResultStatus } from "@/features/study/study-types";

export const uiTimestamp = Date.UTC(2026, 4, 21, 8, 0, 0);

export function createReadingPassage(overrides: Partial<{
  id: string;
  title: string;
  content: string;
  simplifiedContent: string | null;
  originalLevel: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
  displayContent: string;
  displayLevel: string;
  questionCount: number;
}> = {}) {
  return {
    id: passageFixture.id,
    title: passageFixture.title,
    content: "Original paragraph one.\n\nOriginal paragraph two with useful detail.",
    simplifiedContent: "Simplified paragraph for learners.",
    originalLevel: "B2",
    simplifiedLevel: "A2",
    wordCount: 160,
    displayContent: "Simplified paragraph for learners.",
    displayLevel: "A2",
    questionCount: generatedQuestionsFixture.length,
    ...overrides,
  };
}

export function createStudyPassage(overrides: Partial<PassageData> = {}): PassageData {
  return {
    id: passageFixture.id,
    title: passageFixture.title,
    content: "Original study passage line one.\n\nOriginal study passage line two.",
    simplifiedContent: "Simplified study passage.",
    originalLevel: "B2",
    simplifiedLevel: "A2",
    wordCount: 180,
    createdAt: uiTimestamp,
    sourceType: "TEXT",
    ...overrides,
  };
}

export function createStudyQuestion(overrides: Partial<QuestionData> = {}): QuestionData {
  const source = generatedQuestionsFixture[0];
  return {
    id: source.id,
    number: 1,
    questionText: source.questionText,
    options: source.options,
    correctAnswer: source.correctAnswer,
    explanation: source.explanation,
    sourceText: source.sourceText,
    sourceLine: source.sourceLine,
    questionType: source.questionType,
    difficulty: source.difficulty,
    ...overrides,
  };
}

export function createStudyResult(overrides: Partial<StudioResult> = {}): StudioResult {
  return {
    id: "result-test-1",
    type: "summary",
    passageId: passageFixture.id,
    title: passageFixture.title,
    status: "completed",
    createdAt: new Date(uiTimestamp).toISOString(),
    updatedAt: new Date(uiTimestamp + 1000).toISOString(),
    ...overrides,
  };
}
