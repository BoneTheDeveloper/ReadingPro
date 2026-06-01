export const passageFixture = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user_test_123",
  title: "The Test Passage",
  content: "Reading tests become easier when fixtures are predictable.",
  simplifiedContent: "Tests are easier with predictable examples.",
  originalLevel: "B1" as const,
  simplifiedLevel: "A2" as const,
  wordCount: 8,
  sourceType: "TEXT" as const,
  fileUrl: null,
  deletedAt: null,
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
};

export const generatedQuestionsFixture = [
  {
    id: "question_test_1",
    passageId: passageFixture.id,
    questionText: "Why are fixtures useful?",
    options: [
      { id: "A", text: "They make tests predictable." },
      { id: "B", text: "They call live services." },
    ],
    correctOption: "A",
    correctAnswer: "A",
    sourceText: "fixtures are predictable",
    sourceLine: 1,
    explanation: "The passage says predictable fixtures help tests.",
    questionType: "MULTIPLE_CHOICE" as const,
    difficulty: 1,
    createdAt: new Date("2026-05-21T00:00:00.000Z"),
  },
];

export const contentAnalysisResultFixture = {
  title: passageFixture.title,
  content: passageFixture.content,
  wordCount: passageFixture.wordCount,
  detectedLevel: passageFixture.originalLevel,
  estimatedReadingTimeMinutes: 1,
};
