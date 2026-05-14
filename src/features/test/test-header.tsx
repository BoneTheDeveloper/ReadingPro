"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  streak: number;
  onBack: () => void;
}

export function TestHeader({
  currentIndex,
  totalQuestions,
  progress,
  streak,
  onBack,
}: TestHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-48 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="font-semibold">{streak}</span>
        </div>
      </div>
    </header>
  );
}
