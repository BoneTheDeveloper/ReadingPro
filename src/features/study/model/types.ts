import type { TranslationData } from "@/lib/translation/shared/translation-response-schema";
import type { StudioArtifact } from "@/lib/study/shared/studio-artifact-types";
export type {
  StudioArtifact,
  StudioArtifactStatus,
  StudioArtifactType,
} from "@/lib/study/shared/studio-artifact-types";
export { ARTIFACT_STALE_TIME } from "@/lib/study/shared/studio-artifact-types";

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

export type ArtifactsCacheStatus = "idle" | "loading" | "success" | "error";

export interface ArtifactsCacheEntry {
  status: ArtifactsCacheStatus;
  data: StudioArtifact[];
  fetchedAt?: number;
  error?: string;
}

export interface ArtifactRef {
  type: StudioArtifact["type"];
  id: string;
}

export interface ArtifactDetailCacheEntry {
  questions?: QuestionData[];
  simplifiedContent?: string | null;
  simplifiedLevel?: string | null;
}

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  status: StudyStatus;
  error: string | null;
  simplifying: boolean;
  uploadModalOpen: boolean;
  artifactsByPassageId: Record<string, ArtifactsCacheEntry>;
  viewingArtifactByPassageId: Record<string, ArtifactRef | null>;
  artifactDetailById: Record<string, ArtifactDetailCacheEntry>;
}

export interface StudyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStart: (fileName: string) => void;
  onUploadComplete: (passage: PassageData) => void;
  onUploadError: (error: string) => void;
}

export type StudioActionId =
  | "quiz"
  | "flashcard"
  | "summary"
  | "chat"
  | "mindmap"
  | "translate";

export interface StudioAction {
  id: StudioActionId;
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
