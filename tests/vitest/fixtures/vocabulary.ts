import { userProfileFixture } from "./user";
import { passageFixture } from "./article";

// --- IDs ---

export const VOCABULARY_ITEM_ID = "550e8400-e29b-41d4-a716-446655440001";
export const VOCAB_SET_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
export const VOCAB_ITEM_FOR_SET_ID = "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b";

// --- Vocabulary Item Fixture ---

export const vocabularyItemFixture = {
  id: VOCABULARY_ITEM_ID,
  userId: userProfileFixture.id,
  normalizedText: "ephemeral",
  displayText: "ephemeral",
  type: "WORD",
  translation: "hap dan",
  sourceLanguage: "en",
  targetLanguage: "vi",
  source: "TRANSLATE",
  dictionaryEntryId: null,
  dictionarySenseId: null,
  status: "NEW",
  savedCount: 1,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-01T00:00:00.000Z"),
};

// --- Vocabulary Set Fixture ---

export const vocabularySetFixture = {
  id: VOCAB_SET_ID,
  userId: userProfileFixture.id,
  name: "My Words",
  type: "MANUAL" as const,
  periodStart: null,
  periodEnd: null,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-01T00:00:00.000Z"),
};

// --- Body Builders ---

export function vocabularyBody(overrides: Record<string, unknown> = {}) {
  return {
    selectedText: "ephemeral",
    translation: "hap dan",
    sourceLanguage: "en",
    targetLanguage: "vi",
    sourceId: passageFixture.id,
    contextSentence: "The ephemeral nature of beauty.",
    ...overrides,
  };
}
