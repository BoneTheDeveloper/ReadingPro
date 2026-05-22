import { generatedQuestionsFixture, passageFixture } from "./article";
import type { PassageData, QuestionData, ResultItem } from "@/features/study/study-types";
import type { TestPassage, TestQuestion } from "@/features/test/test-types";

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

export function createStudyResult(overrides: Partial<ResultItem> = {}): ResultItem {
  return {
    id: "result-test-1",
    type: "summary",
    passageId: passageFixture.id,
    passageTitle: passageFixture.title,
    status: "completed",
    startedAt: uiTimestamp,
    completedAt: uiTimestamp + 1000,
    data: {
      simplifiedContent: "Completed summary text.",
      simplifiedLevel: "A2",
    },
    ...overrides,
  };
}

export function createTestPassage(overrides: Partial<TestPassage> = {}): TestPassage {
  return {
    id: passageFixture.id,
    title: passageFixture.title,
    content: "Line one introduces the topic.\nLine two says fixtures make tests predictable.\nLine three closes the passage.",
    originalLevel: "B1",
    wordCount: 24,
    ...overrides,
  };
}

export function createTestQuestion(overrides: Partial<TestQuestion> = {}): TestQuestion {
  const source = generatedQuestionsFixture[0];
  return {
    id: source.id,
    number: 1,
    questionText: source.questionText,
    options: [
      { id: "A", text: "They make tests predictable." },
      { id: "B", text: "They call live services." },
      { id: "C", text: "They hide failures." },
      { id: "D", text: "They remove assertions." },
    ],
    correctAnswer: "A",
    explanation: source.explanation,
    sourceText: source.sourceText,
    sourceLine: 2,
    questionType: source.questionType,
    difficulty: source.difficulty,
    ...overrides,
  };
}
