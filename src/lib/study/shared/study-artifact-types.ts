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

export const RESULT_STALE_TIME = 60_000;
