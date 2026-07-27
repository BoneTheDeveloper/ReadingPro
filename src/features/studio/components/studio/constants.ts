import { HelpCircle, Layers, type LucideIcon } from "lucide-react";
import type { StudioArtifactType } from "@/features/studio/schemas/studio";

export const ARTIFACT_META: Record<StudioArtifactType, { icon: LucideIcon; label: string }> = {
  question: { icon: HelpCircle, label: "Câu hỏi" },
  flashcard: { icon: Layers, label: "Flashcards" },
};
