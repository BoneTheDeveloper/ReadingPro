import type { TranslationData } from "@/lib/translation/shared/translation-response-schema";

export type StudyStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ready"
  | "error";

export type SourceType = "TEXT" | "PDF" | "YOUTUBE";

export interface PassageData {
  id: string;
  title: string;
  content: string;
  simplifiedContent: string | null;
  originalLevel: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
  createdAt: number;
  sourceType: SourceType;
}

export interface DocumentItem {
  id: string;
  title: string;
  date: string;
  level: string | null;
  wordCount: number;
  sourceType: SourceType;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionData {
  id: string;
  number: number;
  questionText: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  sourceText: string;
  sourceLine: number;
  questionType: string;
  difficulty: number;
}

export type StudioResultType = "quiz" | "summary" | "chat" | "flashcard" | "mindmap";
export type StudioResultStatus = "running" | "completed" | "error";

export interface StudioResult {
  id: string;
  type: StudioResultType;
  passageId: string;
  title: string;
  status: StudioResultStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ResultsCacheStatus = "idle" | "loading" | "success" | "error";

export interface ResultsCacheEntry {
  status: ResultsCacheStatus;
  data: StudioResult[];
  fetchedAt?: number;
  error?: string;
}

export interface ResultRef {
  type: StudioResult["type"];
  id: string;
}

export interface DetailCacheEntry {
  questions?: QuestionData[];
  simplifiedContent?: string | null;
  simplifiedLevel?: string | null;
}

export const RESULT_STALE_TIME = 60_000;

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  status: StudyStatus;
  error: string | null;
  simplifying: boolean;
  uploadModalOpen: boolean;
  resultsByPassageId: Record<string, ResultsCacheEntry>;
  viewingResultByPassageId: Record<string, ResultRef | null>;
  resultDetailById: Record<string, DetailCacheEntry>;
}

export interface StudyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStart: (fileName: string) => void;
  onUploadComplete: (passage: PassageData) => void;
  onUploadError: (error: string) => void;
}

export type StudioCardId =
  | "quiz"
  | "flashcards"
  | "summary"
  | "chat"
  | "mindmap"
  | "translate";

export interface StudioCard {
  id: StudioCardId;
  label: string;
  description: string;
  iconName: string;
  disabled?: boolean;
}


export type TranslationProvider = TranslationData["provider"];

export interface TranslationSelection {
  selectedText: string;
  selectionRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  actionRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
  clientMetrics?: {
    wordsBeforeSelected: number;
  };
}

export type QuickTranslationData = TranslationData;
