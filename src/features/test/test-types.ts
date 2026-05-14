export interface TestQuestion {
  id: string;
  number: number;
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  sourceText: string;
  sourceLine: number;
  questionType: string;
  difficulty: number;
}

export interface TestPassage {
  id: string;
  title: string;
  content: string;
  originalLevel: string | null;
  wordCount: number;
}
