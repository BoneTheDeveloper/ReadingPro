"use client";

import { BookOpen, HelpCircle, Layers, MessageCircle, PanelRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StudioGridId } from "@/features/studio/schemas/studio";

interface CollapsedSidebarProps {
  hasActivePassage: boolean;
  onToggleCollapse: () => void;
  onSelectChat: () => void;
  onSelectAction: (actionId: StudioGridId) => void;
}

const COLLAPSED_TILES = [
  { id: "question" as StudioGridId, icon: HelpCircle, label: "Câu hỏi" },
  { id: "flashcard" as StudioGridId, icon: Layers, label: "Flashcards" },
  { id: "summary" as StudioGridId, icon: BookOpen, label: "Tóm tắt" },
  { id: "chat" as StudioGridId, icon: MessageCircle, label: "Trò chuyện" },
] as const;

export function CollapsedSidebar({  onToggleCollapse}: CollapsedSidebarProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full items-center">
        <div className="w-full p-2 flex justify-center border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Expand studio panel"
          >
            <PanelRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="w-full px-2 py-2 flex flex-col items-center gap-1">
          {COLLAPSED_TILES.map((tile) => (
            <button
              key={tile.id}
              onClick={onToggleCollapse}
              title={tile.label}
              aria-label={tile.label}
              className="w-11 h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            >
              <tile.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
