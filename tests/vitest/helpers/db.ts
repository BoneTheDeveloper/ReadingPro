import { expect } from "vitest";
import { db, resetDbMock } from "../mocks/db";
import { passageFixture } from "../fixtures/article";
import { userProfileFixture } from "../fixtures/user";

export function resetAllDbMocks() {
  resetDbMock();
}

export function seedCommonDbMocks() {
  db.userProfile.findUnique.mockResolvedValue(userProfileFixture);
  db.passage.findUnique.mockResolvedValue(passageFixture);
  db.passage.findMany.mockResolvedValue([passageFixture]);
}

export function expectNoUnexpectedDbWrites() {
  expect(db.questionReview.create).not.toHaveBeenCalled();
  expect(db.questionReview.update).not.toHaveBeenCalled();
  expect(db.passage.create).not.toHaveBeenCalled();
  expect(db.passage.update).not.toHaveBeenCalled();
  expect(db.question.create).not.toHaveBeenCalled();
  expect(db.studySession.create).not.toHaveBeenCalled();
  expect(db.studySession.update).not.toHaveBeenCalled();
  expect(db.userProfile.create).not.toHaveBeenCalled();
}
