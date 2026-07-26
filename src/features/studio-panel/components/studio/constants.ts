import { HelpCircle, Layers, type LucideIcon } from "lucide-react";
import type { StudioArtifactType } from "@/features/studio-panel/schemas/studio-artifact";

/**
 * Icon + label for each persisted artifact type. Chat is not an artifact and
 * lives with the action tiles instead.
 */
export const ARTIFACT_META: Record<StudioArtifactType, { icon: LucideIcon; label: string }> = {
  question: { icon: HelpCircle, label: "Câu hỏi" },
  flashcard: { icon: Layers, label: "Flashcards" },
};
