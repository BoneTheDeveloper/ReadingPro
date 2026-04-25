"use client";

import { useEffect } from "react";
import { PanelRight, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Button } from "@/component/ui/button";

interface StudioDetailViewProps {
  title: string;
  onClose: () => void;
  onToggleCollapse?: () => void;
  size?: "default" | "expanded";
  children: React.ReactNode;
}

export function StudioDetailView({
  title,
  onClose,
  onToggleCollapse,
  size: _size = "default",
  children,
}: StudioDetailViewProps) {
  // Handle Escape key to close the panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="h-[54px] px-4 flex items-center justify-between border-b border-border">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-[11px] font-bold text-ink-3 uppercase tracking-[0.13em]"
          >
            <span className="hover:underline">Studio</span>
            <ChevronRight className="w-3 h-3" />
            {title}
          </button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Collapse studio panel"
            >
              <PanelRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll relative">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
