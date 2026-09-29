import { ListChecks, Layers, MessageCircle, type LucideIcon } from "lucide-react";
import { StudioArtifactType } from "@/generated/prisma/enums";

export type StudioGridId = StudioArtifactType | "CHAT";

type TileLabel = { name: string; action: string; icon: LucideIcon };

type GenerateTile = TileLabel & { kind: "generate"; gridId: StudioArtifactType };
type OpenTile = TileLabel & { kind: "open"; gridId: "CHAT" };

export type StudioTile = GenerateTile | OpenTile;

export const ARTIFACT_META: Record<StudioArtifactType, TileLabel> = {
  [StudioArtifactType.QUESTION]: { name: "Câu hỏi", action: "Tạo câu hỏi", icon: ListChecks },
  [StudioArtifactType.FLASHCARD]: { name: "Flashcards", action: "Tạo flashcards", icon: Layers },
};

export const STUDIO_TILES: StudioTile[] = [
  { kind: "generate", gridId: StudioArtifactType.QUESTION, ...ARTIFACT_META[StudioArtifactType.QUESTION] },
  { kind: "generate", gridId: StudioArtifactType.FLASHCARD, ...ARTIFACT_META[StudioArtifactType.FLASHCARD] },
  { kind: "open", gridId: "CHAT", name: "Trò chuyện", action: "Mở trò chuyện", icon: MessageCircle },
];

export type StudioPanelView =
  | { contentType: "chat" }
  | { contentType: "question"; artifactId: string }
  | { contentType: "flashcard"; artifactId: string }
  | null;
