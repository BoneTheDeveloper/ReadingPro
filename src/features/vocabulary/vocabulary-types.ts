export type VocabularyStatus = "NEW" | "LEARNING" | "MASTERED";

export type VocabularySource = "USER_SAVED" | "DICTIONARY";

export type VocabularyType = "WORD" | "PHRASE";

export type VocabularySetType = "MANUAL" | "DAILY" | "WEEKLY";

export interface VocabularyItem {
  id: string;
  normalizedText: string;
  displayText: string;
  type: VocabularyType;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: VocabularyStatus;
  source: VocabularySource;
  savedCount: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  occurrences: VocabularyOccurrence[];
}

export interface VocabularyOccurrence {
  id: string;
  vocabularyItemId: string;
  sourceId: string | null;
  selectedText: string;
  contextSentence: string | null;
  createdAt: string;
}

export interface VocabularySet {
  id: string;
  name: string;
  type: VocabularySetType;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    items: number;
  };
}

export interface VocabularyListResponse {
  success: true;
  data: {
    items: VocabularyItem[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface VocabularySetsResponse {
  success: true;
  data: VocabularySet[];
}

export interface VocabularySuccessResponse {
  success: true;
  data: VocabularyItem;
}
