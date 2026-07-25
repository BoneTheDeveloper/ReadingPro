"use client";

import { PanelRight, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PanelHeader } from "../panel-header";
import { StudyChatPanel } from "./study-chat";

interface ChatDetailViewProps {
  passageId: string;
  chatPrefill: string | null;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function ChatDetailView({ passageId, chatPrefill, onClose, onToggleCollapse }: ChatDetailViewProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <PanelHeader
          left={
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <span className="hover:underline">Studio</span>
              <ChevronRight className="w-3 h-3" />
              Trò chuyện
            </button>
          }
          onCollapse={onToggleCollapse}
          collapseIcon={<PanelRight className="w-4 h-4" />}
          collapseLabel="Collapse studio panel"
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <StudyChatPanel
            key={`${passageId}-${chatPrefill ?? "empty"}`}
            passageId={passageId}
            prefilledQuestion={chatPrefill}
          />
        </div>
      </CardContent>
    </Card>
  );
}
