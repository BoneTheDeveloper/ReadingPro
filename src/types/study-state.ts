// Shared types for Study workspace state
// Used by study hooks and components

import type { PassageData } from "./passage";
import type { ArtifactsCacheEntry, ArtifactRef, ArtifactDetailCacheEntry } from "@/features/studio-panel/schemas/studio-artifact";

type StudyStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ready"
  | "error";

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  status: StudyStatus;
  error: string | null;
  uploadModalOpen: boolean;
  artifactsByPassageId: Record<string, ArtifactsCacheEntry>;
  viewingArtifactByPassageId: Record<string, ArtifactRef | null>;
  artifactDetailById: Record<string, ArtifactDetailCacheEntry>;
}
