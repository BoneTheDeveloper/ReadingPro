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

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  questions: QuestionData[];
  status: StudyStatus;
  error: string | null;
  simplifying: boolean;
  generatingQuestions: boolean;
  uploadModalOpen: boolean;
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

export type ResultItemType = "quiz" | "summary";
export type ResultItemStatus = "running" | "completed" | "error";

export interface ResultItemData {
  questions?: QuestionData[];
  simplifiedContent?: string | null;
  simplifiedLevel?: string | null;
}

export interface ResultItem {
  id: string;
  type: ResultItemType;
  passageId: string;
  passageTitle: string;
  status: ResultItemStatus;
  startedAt: number;
  completedAt?: number;
  data?: ResultItemData;
}

export type TranslationProvider = "cache" | "dictionary" | "fallback" | "google_translate" | "ai";

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

export interface QuickTranslationData {
  translation: string;
  type?: string | null;
  provider: TranslationProvider;
}

