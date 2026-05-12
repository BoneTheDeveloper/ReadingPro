"use client";

import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TestPassagePanelProps {
  title: string;
  content: string;
  showPassage: boolean;
  showFeedback: boolean;
  highlightedLine: number;
  onTogglePassage: () => void;
}

export function TestPassagePanel({
  title,
  content,
  showPassage,
  showFeedback,
  highlightedLine,
  onTogglePassage,
}: TestPassagePanelProps) {
  const passageLines = content.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className="mb-6 lg:mb-0">
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onTogglePassage} className="lg:hidden text-primary">
            {showPassage ? "Hide" : "Show"} Passage
          </Button>
        </div>
        <div
          className={cn(
            "p-6 max-h-[400px] overflow-y-auto",
            "lg:block",
            showPassage ? "block" : "hidden",
          )}
        >
          {passageLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "relative pl-8 mb-3 text-foreground font-serif",
                showFeedback && i + 1 === highlightedLine && "bg-primary/10 rounded px-2 -mx-2 pl-10",
              )}
            >
              <span className="absolute left-0 top-0 text-xs text-muted-foreground font-sans w-5 text-right">
                {i + 1}
              </span>
              <span
                className={cn(
                  showFeedback && i + 1 === highlightedLine && "bg-linear-to-t from-primary/10 to-transparent",
                )}
              >
                {line}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
