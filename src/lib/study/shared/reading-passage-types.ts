export interface ReadingPassageData {
  id: string;
  title: string;
  content: string;
  simplifiedContent: string | null;
  originalLevel: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
  displayContent: string;
  displayLevel: string;
  questionCount: number;
}
