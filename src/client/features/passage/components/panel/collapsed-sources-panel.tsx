"use client";

import { Plus, FileText, File, PlayCircle, PanelRight } from "lucide-react";
import { Card, CardContent } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import type { PassageListItem } from "@/shared/passage/schema";
import type { SourceType } from "@/shared/enums";

const SOURCE_TYPE_VISUAL: Record<SourceType, { icon: typeof FileText; color: string }> = {
  TEXT: { icon: FileText, color: "text-primary" },
  PDF: { icon: File, color: "text-gold" },
  YOUTUBE: { icon: PlayCircle, color: "text-coral" },
};

interface CollapsedSourcesPanelProps {
  items: PassageListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenUploadModal: () => void;
  onToggleCollapse: () => void;
}

export function CollapsedSourcesPanel({
  items,
  activeId,
  onSelect,
  onOpenUploadModal,
  onToggleCollapse,
}: CollapsedSourcesPanelProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden bg-background rounded-none py-0 gap-0 ring-0 shadow-none">
      <CardContent className="p-0 flex flex-col h-full items-center">
        <div className="w-full p-2 flex justify-center border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <PanelRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="w-full px-2 pt-2 pb-1 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenUploadModal}
            className="h-9 w-9 bg-primary text-primary-foreground shadow-indigo hover:bg-indigo-hover hover:text-primary-foreground"
            title="Thêm nguồn"
            aria-label="Thêm nguồn"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto panel-scroll w-full px-2 py-1">
          <div className="flex flex-col items-center gap-1">
            {items.filter((item) => item.status === "COMPLETED").map((item) => {
              const isActive = activeId === item.id;
              const { icon: Icon, color } = SOURCE_TYPE_VISUAL[item.sourceType];
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  title={item.title}
                  className={cn(
                    "w-11 h-11 rounded-[13px] flex items-center justify-center transition-colors cursor-pointer",
                    isActive
                      ? cn("bg-surface ring-2 ring-primary shadow-card", color)
                      : cn(color, "hover:bg-surface"),
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
