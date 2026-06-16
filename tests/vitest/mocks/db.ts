import { vi } from "vitest";

function createModelMock() {
  return {
    aggregate: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  };
}

export const db = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (input: unknown) => {
    if (typeof input === "function") return input(db);
    return Promise.all(input as Promise<unknown>[]);
  }),
  passage: createModelMock(),
  question: createModelMock(),
  studySession: createModelMock(),
  studyChatMessage: createModelMock(),
  dictionaryEntry: createModelMock(),
  dictionarySense: createModelMock(),
  dictionaryTranslation: createModelMock(),
  dictionaryAlias: createModelMock(),
  dictionarySourceAudit: createModelMock(),
  translationCache: createModelMock(),
  translationHistory: createModelMock(),
  vocabularyItem: createModelMock(),
  vocabularyOccurrence: createModelMock(),
  vocabularySet: createModelMock(),
  vocabularySetItem: createModelMock(),
  fileUploadIntent: createModelMock(),
  userProfile: createModelMock(),
  studioArtifact: createModelMock(),
  quizResult: createModelMock(),
};

export function resetDbMock() {
  for (const value of Object.values(db)) {
    if (typeof value === "function" && "mockReset" in value) {
      value.mockReset();
      continue;
    }

    if (value && typeof value === "object") {
      for (const modelMethod of Object.values(value)) {
        if (typeof modelMethod === "function" && "mockReset" in modelMethod) {
          modelMethod.mockReset();
        }
      }
    }
  }
}
