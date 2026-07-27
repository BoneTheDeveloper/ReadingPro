"use client";

import { Button } from "@/components/ui/button";

interface PanelHeaderProps {
  left: React.ReactNode;
  onCollapse?: () => void;
  collapseIcon?: React.ReactNode;
  collapseLabel?: string;
}

export function PanelHeader({ left, onCollapse, collapseIcon, collapseLabel }: PanelHeaderProps) {
  return (
    <div className="h-[54px] px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0 flex-1">{left}</div>
      {onCollapse && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title={collapseLabel}
          aria-label={collapseLabel}
        >
          {collapseIcon}
        </Button>
      )}
    </div>
  );
}
