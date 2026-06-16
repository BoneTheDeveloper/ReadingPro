export type StudioArtifactType = "quiz" | "flashcard";
export type StudioArtifactStatus = "generating" | "done" | "failed";

export interface StudioArtifact {
  id: string;
  type: StudioArtifactType;
  passageId: string;
  title: string;
  status: StudioArtifactStatus;
  createdAt: string;
  updatedAt?: string;
}

export const ARTIFACT_STALE_TIME = 60_000;
