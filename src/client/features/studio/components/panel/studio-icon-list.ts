import { BookA, ListChecks, Layers, MessageCircle, type LucideIcon } from "lucide-react";
import { StudioArtifactType } from "@/shared/enums";

export type StudioGridId = StudioArtifactType | "CHAT" | "LOOKUP";

/**
 * Each studio tool owns one hue so a tile and every artifact it produced read
 * as the same thing at a glance: questions teal, flashcards amber, chat coral,
 * word lookup green.
 */
export type StudioTone = "teal" | "amber" | "coral" | "green";

export const TONE_CLASSES: Record<StudioTone, { icon: string; hoverBg: string }> = {
  teal: { icon: "text-primary", hoverBg: "hover:bg-indigo-soft" },
  amber: { icon: "text-gold", hoverBg: "hover:bg-amber-soft" },
  coral: { icon: "text-coral", hoverBg: "hover:bg-coral-soft" },
  green: { icon: "text-success", hoverBg: "hover:bg-success-soft" },
};

type TileLabel = { name: string; action: string; icon: LucideIcon; tone: StudioTone };

type GenerateTile = TileLabel & { kind: "generate"; gridId: StudioArtifactType };
type OpenTile = TileLabel & { kind: "open"; gridId: "CHAT" | "LOOKUP" };

export type StudioTile = GenerateTile | OpenTile;

export const ARTIFACT_META: Record<StudioArtifactType, TileLabel> = {
  [StudioArtifactType.QUESTION]: { name: "Câu hỏi", action: "Tạo câu hỏi", icon: ListChecks, tone: "teal" },
  [StudioArtifactType.FLASHCARD]: { name: "Flashcards", action: "Tạo flashcards", icon: Layers, tone: "amber" },
};

export const LOOKUP_META: TileLabel = { name: "Tra từ", action: "Mở tra từ", icon: BookA, tone: "green" };

/** Starts a lookup of a word selected in the passage, with its sentence. */
export type WordLookupRequest = { word: string; context?: string };

export const STUDIO_TILES: StudioTile[] = [
  { kind: "generate", gridId: StudioArtifactType.QUESTION, ...ARTIFACT_META[StudioArtifactType.QUESTION] },
  { kind: "generate", gridId: StudioArtifactType.FLASHCARD, ...ARTIFACT_META[StudioArtifactType.FLASHCARD] },
  { kind: "open", gridId: "CHAT", name: "Trò chuyện", action: "Mở trò chuyện", icon: MessageCircle, tone: "coral" },
  { kind: "open", gridId: "LOOKUP", ...LOOKUP_META },
];

export type StudioPanelView =
  | { contentType: "chat" }
  | { contentType: "question"; artifactId: string }
  | { contentType: "flashcard"; artifactId: string }
  /**
   * `request` starts a lookup, `lookupId` reopens a stored row, and neither
   * shows the empty search box.
   */
  | { contentType: "lookup"; lookupId?: string; request?: WordLookupRequest }
  | null;
