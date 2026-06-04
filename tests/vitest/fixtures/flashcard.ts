import { generatedQuestionsFixture, passageFixture } from "./article";

export const cardReviewFixture = {
  id: "f1e2d3c4-b5a6-4978-8695-abcdef012345",
  userId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
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

export const dueCardFixture = {
  ...cardReviewFixture,
  nextReviewDate: new Date("2026-05-20T00:00:00.000Z"),
  question: {
    ...generatedQuestionsFixture[0],
    passage: passageFixture,
  },
};

export const studySessionFixture = {
  id: "b2c3d4e5-f6a7-48b9-9c0d-1e2f3a4b5c6d",
  userId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  passageId: passageFixture.id,
  startedAt: new Date("2026-05-21T00:00:00.000Z"),
  completedAt: null,
  cardsReviewed: 0,
  newCards: 0,
  correctCount: 0,
  incorrectCount: 0,
  accuracyRate: null,
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
};
