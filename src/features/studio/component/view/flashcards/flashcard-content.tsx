"use client";

import { useState, useCallback } from "react";
import { Button } from "@/component/ui/button";
import { cn } from "@/lib/utils";

interface FlashcardContentProps {
  cards: { front: string; back: string }[];
  currentCardIndex: number;
  cardsRemaining: number;
  onAnswer: (remembered: boolean) => void;
}

export function FlashcardContent({
  cards,
  currentCardIndex,
  cardsRemaining,
  onAnswer,
}: FlashcardContentProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentCardIndex];

  const handleAnswer = useCallback(
    (remembered: boolean) => {
      if (!isFlipped) return;

      setIsFlipped(false);
      // Reset flip for next card, but parent handles the actual card change
      onAnswer(remembered);
    },
    [isFlipped, onAnswer],
  );

  // Reset flip state when card changes
  if (isFlipped && cards[currentCardIndex] !== currentCard) {
    setIsFlipped(false);
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Progress - show remaining cards in queue */}
      <div className="text-sm text-muted-foreground">
        Còn {cardsRemaining} thẻ
      </div>

      {/* Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full max-w-md h-64 cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div
          className={cn(
            "relative w-full h-full transition-transform duration-300",
            isFlipped && "rotate-y-180",
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-card rounded-xl border p-6 flex items-center justify-center text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-lg font-medium">{currentCard.front}</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-primary/10 rounded-xl border p-6 flex items-center justify-center text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-lg">{currentCard.back}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Nhấn để lật</p>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-md">
        <Button
          onClick={() => handleAnswer(false)}
          className="flex-1"
          disabled={!isFlipped}
          variant="outline"
        >
          Chưa
        </Button>
        <Button
          onClick={() => handleAnswer(true)}
          className="flex-1"
          disabled={!isFlipped}
        >
          Nhớ rồi
        </Button>
      </div>
    </div>
  );
}
