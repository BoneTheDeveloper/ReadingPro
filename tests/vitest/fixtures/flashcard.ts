import { generatedQuestionsFixture, passageFixture } from "./article";

export const questionReviewFixture = {
  id: "f1e2d3c4-b5a6-4978-8695-abcdef012345",
  userId: "user_test_reader",
  questionId: generatedQuestionsFixture[0].id,
  qualityRating: 4,
  easeFactor: 2.5,
  intervalDays: 1,
  repetitions: 1,
  nextReviewDate: new Date("2026-05-22T00:00:00.000Z"),
  reviewedAt: new Date("2026-05-21T00:00:00.000Z"),
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
};

export const dueQuestionFixture = {
  ...questionReviewFixture,
  nextReviewDate: new Date("2026-05-20T00:00:00.000Z"),
  question: {
    ...generatedQuestionsFixture[0],
    passage: passageFixture,
  },
};

export const studySessionFixture = {
  id: "b2c3d4e5-f6a7-48b9-9c0d-1e2f3a4b5c6d",
  userId: "user_test_reader",
  startedAt: new Date("2026-05-21T00:00:00.000Z"),
  completedAt: null,
  lastActivityAt: new Date("2026-05-21T00:05:00.000Z"),
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
};
