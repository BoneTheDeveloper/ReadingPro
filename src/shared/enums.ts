// Browser-safe copies of the Prisma enums that cross the API boundary.
// src/server/lib/enum-sync.ts fails typecheck if these drift from the schema.

export const CEFRLevel = {
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
  C2: "C2",
} as const;
export type CEFRLevel = (typeof CEFRLevel)[keyof typeof CEFRLevel];

export const SourceType = {
  TEXT: "TEXT",
  PDF: "PDF",
  YOUTUBE: "YOUTUBE",
} as const;
export type SourceType = (typeof SourceType)[keyof typeof SourceType];

export const VocabularyStatus = {
  NEW: "NEW",
  LEARNING: "LEARNING",
  REVIEW: "REVIEW",
  RELEARNING: "RELEARNING",
} as const;
export type VocabularyStatus = (typeof VocabularyStatus)[keyof typeof VocabularyStatus];

export const ReviewRating = {
  AGAIN: "AGAIN",
  HARD: "HARD",
  GOOD: "GOOD",
  EASY: "EASY",
} as const;
export type ReviewRating = (typeof ReviewRating)[keyof typeof ReviewRating];

export const StudioArtifactType = {
  QUESTION: "QUESTION",
  FLASHCARD: "FLASHCARD",
} as const;
export type StudioArtifactType = (typeof StudioArtifactType)[keyof typeof StudioArtifactType];

export const ProcessingStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ProcessingStatus = (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

export const PartOfSpeech = {
  NOUN: "NOUN",
  VERB: "VERB",
  ADJECTIVE: "ADJECTIVE",
  ADVERB: "ADVERB",
  PREPOSITION: "PREPOSITION",
  CONJUNCTION: "CONJUNCTION",
  PHRASE: "PHRASE",
  OTHER: "OTHER",
} as const;
export type PartOfSpeech = (typeof PartOfSpeech)[keyof typeof PartOfSpeech];
