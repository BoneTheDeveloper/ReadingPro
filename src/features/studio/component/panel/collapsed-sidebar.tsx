"use client";

import { PanelRight } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Button } from "@/component/ui/button";

interface CollapsedSidebarProps {
  onToggleCollapse: () => void;
}

export function CollapsedSidebar({ onToggleCollapse }: CollapsedSidebarProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full items-center">
        <div className="w-full p-2 flex justify-center border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Mở panel studio"
          >
            <PanelRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="w-full px-2 py-2 flex flex-col items-center gap-1" aria-hidden="true">
          {/* Icon only — parent button handles navigation */}
        </div>
      </CardContent>
    </Card>
  );
}
