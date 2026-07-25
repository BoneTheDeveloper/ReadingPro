"use client";

import { HelpCircle, MessageCircle, PanelRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioActionId } from "@/features/studio-panel/schemas/studio-action";

interface CollapsedSidebarProps {
  hasActivePassage: boolean;
  onToggleCollapse: () => void;
  onSelectChat: () => void;
  onSelectAction: (actionId: StudioActionId) => void;
}

const COLLAPSED_TILES = [
  { id: "quiz" as StudioActionId, icon: HelpCircle, label: "Câu hỏi" },
  { id: "chat" as StudioActionId, icon: MessageCircle, label: "Trò chuyện" },
] as const;

export function CollapsedSidebar({ hasActivePassage, onToggleCollapse, onSelectChat, onSelectAction }: CollapsedSidebarProps) {
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
              onClick={() => {
                if (!hasActivePassage) return;
                if (tile.id === "chat") onSelectChat();
                else onSelectAction(tile.id);
              }}
              disabled={!hasActivePassage}
              title={tile.label}
              aria-label={tile.label}
              className={cn(
                "w-11 h-11 rounded-lg flex items-center justify-center transition-colors",
                hasActivePassage
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  : "text-muted-foreground/30 cursor-not-allowed",
              )}
            >
              <tile.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
