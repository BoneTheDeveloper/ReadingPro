import { expect } from "vitest";

export function expectApiSuccessPayload(payload: unknown) {
  expect(payload).toBeTruthy();
  expect(payload).not.toHaveProperty("error");
}

export function expectApiErrorPayload(payload: unknown, message?: string) {
  expect(payload).toHaveProperty("error");
  if (message) {
    expect(payload).toMatchObject({ error: message });
  }
}

export function expectQuestionShape(question: unknown) {
  expect(question).toMatchObject({
    questionText: expect.any(String),
    options: expect.any(Array),
    sourceText: expect.any(String),
    sourceLine: expect.any(Number),
    explanation: expect.any(String),
  });
}

export function expectPassageShape(passage: unknown) {
  expect(passage).toMatchObject({
    id: expect.any(String),
    title: expect.any(String),
    content: expect.any(String),
    wordCount: expect.any(Number),
  });
}
