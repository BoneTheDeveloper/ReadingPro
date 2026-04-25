"use client";

import { Plus, FileText, File, PlayCircle, PanelRight } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { cn } from "@/lib/utils";
import type { PassageListItem } from "@/features/passage/schema";
import type { SourceType } from "@/generated/prisma/enums";

const SOURCE_TYPE_VISUAL: Record<SourceType, { icon: typeof FileText; chip: string }> = {
  TEXT: { icon: FileText, chip: "bg-indigo-soft text-primary" },
  PDF: { icon: File, chip: "bg-amber-soft text-amber-text" },
  YOUTUBE: { icon: PlayCircle, chip: "bg-coral-soft text-coral-hover" },
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
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
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
            className="h-9 w-9 text-muted-foreground hover:text-primary"
            title="Thêm nguồn"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto panel-scroll w-full px-2 py-1">
          <div className="flex flex-col items-center gap-1">
            {items.map((item) => {
              const isActive = activeId === item.id;
              const { icon: Icon, chip } = SOURCE_TYPE_VISUAL[item.sourceType];
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  title={item.title}
                  className={cn(
                    "w-11 h-11 rounded-[13px] flex items-center justify-center transition-colors cursor-pointer",
                    isActive
                      ? "bg-indigo-soft text-primary"
                      : cn(chip, "opacity-70 hover:opacity-100"),
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
