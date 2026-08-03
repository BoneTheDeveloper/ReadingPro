"use client";

import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";

interface StudioDetailViewProps {
  title: string;
  onClose: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function StudioDetailView({
  title,
  onClose,
  action,
  children,
}: StudioDetailViewProps) {
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
        <div className="h-[54px] shrink-0 pl-2 pr-2.5 flex items-center gap-1.5 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            aria-label="Quay lại Studio"
            title="Quay lại Studio"
            className="flex items-center justify-center w-[30px] h-[30px] shrink-0 rounded-[9px] border border-transparent text-muted-foreground transition-colors hover:bg-surface hover:border-border hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="w-[17px] h-[17px] stroke-[2.2]" />
          </button>
          <nav
            aria-label="Đường dẫn"
            className="flex-1 min-w-0 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.11em]"
          >
            {/* Cùng cỡ chữ với trang hiện tại, chỉ khác ở độ đậm và màu. */}
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-[10.5px] font-medium uppercase tracking-[0.11em] text-ink-3 transition-colors hover:text-primary"
            >
              Studio
            </button>
            <span aria-hidden className="shrink-0 text-border-strong">
              /
            </span>
            <span aria-current="page" className="font-bold text-foreground truncate">
              {title}
            </span>
          </nav>
          {action ? <div className="shrink-0 flex items-center">{action}</div> : null}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto panel-scroll relative">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
