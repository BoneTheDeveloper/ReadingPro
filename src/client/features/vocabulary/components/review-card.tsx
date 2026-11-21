"use client";

import { Link } from "react-router";
import { Button } from "@/client/components/ui/button";
import type { PartOfSpeech, ReviewRating } from "@/shared/enums";
import type { ReviewCard as ReviewCardData } from "@/shared/vocabulary/review-schema";
import { formatInterval } from "../lib/format-interval";

const POS_LABEL: Record<Exclude<PartOfSpeech, "OTHER">, string> = {
  NOUN: "danh từ",
  VERB: "động từ",
  ADJECTIVE: "tính từ",
  ADVERB: "trạng từ",
  PREPOSITION: "giới từ",
  CONJUNCTION: "liên từ",
  PHRASE: "cụm từ",
};

const RATINGS: Array<{ rating: ReviewRating; label: string; color: string }> = [
  { rating: "AGAIN", label: "Quên", color: "var(--danger)" },
  { rating: "HARD", label: "Khó", color: "var(--amber-text)" },
  { rating: "GOOD", label: "Được", color: "var(--status-known-text)" },
  { rating: "EASY", label: "Dễ", color: "var(--indigo-hover)" },
];

interface ReviewCardProps {
  card: ReviewCardData;
  /** When the card was shown; the button intervals are measured from here. */
  shownAt: number;
  flipped: boolean;
  rating: boolean;
  onFlip: () => void;
  onRate: (rating: ReviewRating) => void;
}

export function ReviewCard({ card, shownAt, flipped, rating, onFlip, onRate }: ReviewCardProps) {
  return (
    <div className="flex flex-col gap-5">
      <div
        className="bg-white border border-border rounded-2xl px-8 py-10 min-h-[260px] flex flex-col items-center justify-center text-center gap-3"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="text-3xl font-extrabold text-foreground">{card.term}</div>
        {card.partofSpeech !== "OTHER" && (
          <div className="text-xs text-ink-3">{POS_LABEL[card.partofSpeech]}</div>
        )}

        {flipped && (
          <div className="mt-4 pt-5 border-t border-border w-full flex flex-col items-center gap-3">
            <div className="text-xl font-semibold text-indigo-hover">{card.translation}</div>
            {card.contextSentence && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[52ch] italic">
                “{card.contextSentence}”
              </p>
            )}
            {card.passage && (
              <Link
                to={`/study?passageId=${card.passage.id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Từ bài đọc: {card.passage.title || "Không có tiêu đề"}
              </Link>
            )}
          </div>
        )}
      </div>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ rating: value, label, color }) => (
            <button
              key={value}
              type="button"
              disabled={rating}
              onClick={() => onRate(value)}
              className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-white px-2 py-3 cursor-pointer transition-colors hover:border-current disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color }}
            >
              <span className="text-sm font-bold">{label}</span>
              <span className="text-[11px] text-ink-3">
                {formatInterval(shownAt, card.nextDue[value])}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Button onClick={onFlip} className="h-11 rounded-xl text-sm font-semibold">
          Hiện đáp án
        </Button>
      )}
    </div>
  );
}
