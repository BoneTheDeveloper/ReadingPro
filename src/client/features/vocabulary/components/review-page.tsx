"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import type { ReviewRating } from "@/shared/enums";
import type { ReviewCard as ReviewCardData, ReviewSession } from "@/shared/vocabulary/review-schema";
import { reviewQueries, vocabularyQueries } from "../api/queries";
import {
  endReviewSession,
  useRateCardMutation,
  useStartReviewSessionMutation,
} from "../api/review-mutations";
import { ReviewCard } from "./review-card";

const MAX_DURATION_MS = 600_000;

/** One review session: start, flip and rate each due card, finish. */
export function ReviewPageClient({ setId }: { setId?: string }) {
  const queryClient = useQueryClient();
  const dueQuery = useQuery(reviewQueries.due(setId));
  const startSession = useStartReviewSessionMutation();
  const rateCard = useRateCardMutation();

  const [session, setSession] = useState<ReviewSession | null>(null);
  const [queue, setQueue] = useState<ReviewCardData[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [shownAt, setShownAt] = useState(0);
  const [ratedCount, setRatedCount] = useState(0);
  const [summary, setSummary] = useState<ReviewSession | null>(null);

  // One id per rating attempt, kept across retries so a resend is not counted twice.
  const pendingReviewId = useRef<string | null>(null);
  const ended = useRef(false);

  const finish = async (active: ReviewSession, cardsReviewed: number) => {
    ended.current = true;
    // Every rating is already saved; if closing the session fails, still show the result.
    const closed = await endReviewSession(active.id).catch(() => ({ ...active, cardsReviewed }));
    setSummary(closed);
    await queryClient.invalidateQueries({ queryKey: vocabularyQueries.all() });
  };

  // Leaving mid-session still closes it; the ratings already sent are kept.
  useEffect(() => {
    if (!session) return;
    return () => {
      if (!ended.current) void endReviewSession(session.id).catch(() => {});
    };
  }, [session]);

  const handleStart = () => {
    const cards = dueQuery.data?.cards ?? [];
    if (cards.length === 0) return;
    startSession.mutate(setId, {
      onSuccess: (started) => {
        ended.current = false;
        setSession(started);
        setQueue(cards);
        setFlipped(false);
        setShownAt(Date.now());
      },
    });
  };

  const handleRate = (rating: ReviewRating) => {
    const card = queue[0];
    if (!session || !card) return;
    pendingReviewId.current ??= crypto.randomUUID();
    rateCard.mutate(
      {
        sessionId: session.id,
        vocabularyItemId: card.id,
        rating,
        clientReviewId: pendingReviewId.current,
        durationMs: Math.min(MAX_DURATION_MS, Date.now() - shownAt),
      },
      {
        onSuccess: ({ card: rated }) => {
          pendingReviewId.current = null;
          const rest = queue.slice(1);
          // Still on a short learning step: see it again before the session ends.
          const next = rated.scheduledDays === 0 ? [...rest, rated] : rest;
          setQueue(next);
          setFlipped(false);
          setShownAt(Date.now());
          setRatedCount(ratedCount + 1);
          if (next.length === 0) void finish(session, ratedCount + 1);
        },
      },
    );
  };

  const current = queue[0];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F2EC]">
      <div className="mx-auto max-w-[640px] px-6 py-10 pb-16">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#221F2B]">Ôn tập</h1>
          <Link to="/vocabulary" className="text-xs font-semibold text-[#5A4FE0] hover:underline">
            ← Từ vựng
          </Link>
        </div>

        {summary ? (
          <Panel>
            <CheckCircle2 className="size-10 text-[#2FA66A]" />
            <div className="text-lg font-bold text-[#221F2B]">Hoàn thành phiên ôn tập</div>
            <p className="text-sm text-[#565160]">Bạn đã chấm {summary.cardsReviewed} lượt thẻ.</p>
            <Button asChild className="h-10 rounded-xl">
              <Link to="/vocabulary">Về trang từ vựng</Link>
            </Button>
          </Panel>
        ) : session && current ? (
          <>
            <div className="mb-3 text-xs text-[#908B98]">Còn {queue.length} thẻ</div>
            <ReviewCard
              key={`${current.id}-${shownAt}`}
              card={current}
              shownAt={shownAt}
              flipped={flipped}
              rating={rateCard.isPending}
              onFlip={() => setFlipped(true)}
              onRate={handleRate}
            />
          </>
        ) : session ? (
          <Panel>
            <Loader2 className="size-5 animate-spin text-[#908B98]" />
          </Panel>
        ) : dueQuery.isPending ? (
          <Panel>
            <Loader2 className="size-5 animate-spin text-[#908B98]" />
          </Panel>
        ) : (
          <StartPanel
            dueCount={dueQuery.data?.dueCount ?? 0}
            newCount={dueQuery.data?.newCount ?? 0}
            starting={startSession.isPending}
            onStart={handleStart}
          />
        )}
      </div>
    </div>
  );
}

function StartPanel({
  dueCount,
  newCount,
  starting,
  onStart,
}: {
  dueCount: number;
  newCount: number;
  starting: boolean;
  onStart: () => void;
}) {
  const nothingDue = dueCount + newCount === 0;
  return (
    <Panel>
      {nothingDue ? (
        <>
          <CheckCircle2 className="size-10 text-[#2FA66A]" />
          <div className="text-lg font-bold text-[#221F2B]">Bạn đã ôn xong</div>
          <p className="text-sm text-[#565160]">Hiện không có thẻ nào đến hạn.</p>
        </>
      ) : (
        <>
          <div className="text-lg font-bold text-[#221F2B]">Sẵn sàng ôn tập</div>
          <p className="text-sm text-[#565160]">
            {dueCount} thẻ đến hạn · {newCount} thẻ mới
          </p>
        </>
      )}
      <Button
        onClick={onStart}
        disabled={nothingDue || starting}
        className="h-10 rounded-xl gap-1.5"
      >
        {starting && <Loader2 className="size-3.5 animate-spin" />}
        Bắt đầu
      </Button>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white border border-[#EAE5DB] rounded-2xl px-8 py-12 flex flex-col items-center text-center gap-3"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04)" }}
    >
      {children}
    </div>
  );
}
