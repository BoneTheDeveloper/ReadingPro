"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";

interface FlashcardContentProps {
  card: { front: string; back: string };
  masteredCount: number;
  totalCards: number;
  remaining: number;
  onAnswer: (remembered: boolean) => void;
}

export function FlashcardContent({
  card,
  masteredCount,
  totalCards,
  remaining,
  onAnswer,
}: FlashcardContentProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const answer = useCallback(
    (remembered: boolean) => {
      if (isFlipped) onAnswer(remembered);
    },
    [isFlipped, onAnswer],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "1") answer(false);
      else if (e.key === "2") answer(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer]);

  const percent = totalCards ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-5 pt-4 pb-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Đã nhớ {masteredCount}
            <span className="text-muted-foreground font-medium"> / {totalCards}</span>
          </span>
          <span className="text-muted-foreground">Còn {remaining} thẻ trong lượt</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalCards}
          aria-valuenow={masteredCount}
          aria-label="Tiến trình ghi nhớ"
        >
          <div className="h-full bg-success rounded-full transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex flex-col items-center px-5 pt-3 gap-3">
        <button
          type="button"
          onClick={() => setIsFlipped((f) => !f)}
          aria-label={isFlipped ? "Mặt sau, nhấn để lật lại" : "Mặt trước, nhấn để lật"}
          className="w-full max-w-md h-64 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ perspective: "1000px" }}
        >
          <div
            className={cn("relative w-full h-full transition-transform duration-300 motion-reduce:transition-none", isFlipped && "rotate-y-180")}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 bg-surface rounded-xl border border-border p-6 flex items-center justify-center text-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-lg font-medium text-foreground">{card.front}</p>
            </div>
            <div
              className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/30 p-6 flex items-center justify-center text-center"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <p className="text-base text-foreground">{card.back}</p>
            </div>
          </div>
        </button>
        <p className="text-xs text-muted-foreground">{isFlipped ? "Bạn đã nhớ thẻ này chưa?" : "Nhấn thẻ hoặc phím Space để lật"}</p>
      </div>

      <div className="w-full max-w-[calc(28rem+2.5rem)] mx-auto px-5 pt-4 pb-5 flex gap-2">
        <Button onClick={() => answer(false)} className="flex-1" disabled={!isFlipped} variant="outline">
          Chưa nhớ
        </Button>
        <Button onClick={() => answer(true)} className="flex-1" disabled={!isFlipped}>
          Nhớ rồi
        </Button>
      </div>
    </div>
  );
}
