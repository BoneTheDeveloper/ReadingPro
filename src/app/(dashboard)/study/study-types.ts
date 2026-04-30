export type StudyStatus = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error';

export interface PassageData {
  id: string;
  title: string;
  content: string;
  simplifiedContent: string | null;
  originalLevel: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
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
  passage: PassageData | null;
  questions: QuestionData[];
  status: StudyStatus;
  error: string | null;
}
