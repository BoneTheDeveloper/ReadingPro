"use client";

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { GENERATED_SET_MAX_SIZE, type VocabularySet } from "@/shared/vocabulary/set-schema";
import { formatDate } from "../lib/format-date";

interface VocabularySetListProps {
  sets: VocabularySet[];
  loading: boolean;
  creating: boolean;
  /** Generating a set is a Pro feature; the control is absent for other tiers. */
  canGenerate: boolean;
  generating: boolean;
  onCreateSet: (name: string) => void;
  onGenerateSet: (name: string, size: number) => void;
  onOpenSet: (id: string) => void;
}

const SET_COLORS = [
  { bg: "var(--indigo-soft)", color: "var(--primary)" },
  { bg: "var(--coral-soft)", color: "var(--coral-text)" },
  { bg: "var(--success-soft)", color: "var(--status-known-text)" },
  { bg: "var(--amber-soft)", color: "var(--amber-text)" },
  { bg: "var(--muted)", color: "var(--muted-foreground)" },
];

const DEFAULT_GENERATED_SIZE = 20;

export function VocabularySetList({
  sets,
  loading,
  creating,
  canGenerate,
  generating,
  onCreateSet,
  onGenerateSet,
  onOpenSet,
}: VocabularySetListProps) {
  const [newSetName, setNewSetName] = useState("");
  const [generatedSize, setGeneratedSize] = useState(DEFAULT_GENERATED_SIZE);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const handleCreate = useCallback(() => {
    const trimmed = newSetName.trim();
    if (!trimmed) return;
    onCreateSet(trimmed);
    setNewSetName("");
  }, [newSetName, onCreateSet]);

  const handleGenerate = useCallback(() => {
    const trimmed = newSetName.trim();
    if (!trimmed) return;
    onGenerateSet(trimmed, generatedSize);
    setNewSetName("");
  }, [newSetName, generatedSize, onGenerateSet]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleCreate();
    },
    [handleCreate],
  );

  if (loading) return <SetCardGridSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {sets.length} bộ từ trong thư viện
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            ref={nameRef}
            placeholder="Tên bộ từ..."
            value={newSetName}
            maxLength={60}
            onChange={(e) => setNewSetName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 w-44 text-xs border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <Button
            size="sm"
            disabled={!newSetName.trim() || creating}
            onClick={handleCreate}
            className="h-9 rounded-xl gap-1.5"
          >
            {creating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3.5" strokeWidth={2.5} />
            )}
            Bộ mới
          </Button>
          {canGenerate && (
            <>
              <Input
                type="number"
                aria-label="Số từ của bộ tự động"
                min={1}
                max={GENERATED_SET_MAX_SIZE}
                value={generatedSize}
                onChange={(e) =>
                  setGeneratedSize(
                    Math.min(GENERATED_SET_MAX_SIZE, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="h-9 w-16 text-xs border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!newSetName.trim() || generating}
                onClick={handleGenerate}
                className="h-9 rounded-xl gap-1.5 border-border hover:border-primary hover:text-indigo-hover"
              >
                {generating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Tạo bộ từ tự động
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set, i) => (
          <SetCard key={set.id} set={set} colorIndex={i} onOpen={onOpenSet} />
        ))}

        <button
          type="button"
          className="group flex flex-col items-center justify-center gap-3 min-h-[168px] rounded-2xl border-2 border-dashed border-border-strong cursor-pointer text-ink-3 font-semibold text-sm transition-all hover:border-primary hover:text-primary hover:bg-primary/3"
          onClick={() => nameRef.current?.focus()}
        >
          <div className="w-9 h-9 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
            <Plus className="size-4" strokeWidth={2.2} />
          </div>
          Bộ mới
        </button>
      </div>
    </div>
  );
}

function SetCard({
  set,
  colorIndex,
  onOpen,
}: {
  set: VocabularySet;
  colorIndex: number;
  onOpen: (id: string) => void;
}) {
  const col = SET_COLORS[colorIndex % SET_COLORS.length];
  const { itemCount, progress } = set;
  // Words that left the first learning steps and are on a day-based schedule.
  const reviewShare = itemCount > 0 ? Math.round((progress.review / itemCount) * 100) : 0;

  return (
    <div
      className="group flex flex-col min-h-[168px] bg-white border border-border rounded-2xl p-5 transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5"
      style={{
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: col.bg, color: col.color }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 6 4 14" />
            <path d="M12 6v14" />
            <path d="M8 8v12" />
            <path d="M4 4v16" />
          </svg>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={
            set.studiedToday
              ? { background: "var(--success-soft)", color: "var(--status-known-text)" }
              : { background: "var(--muted)", color: "var(--ink-3)" }
          }
        >
          {set.studiedToday ? "Hôm nay đã học" : "Hôm nay chưa học"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpen(set.id)}
        className="block w-full text-left text-sm font-bold text-foreground mb-0.5 leading-snug line-clamp-2 cursor-pointer hover:text-indigo-hover"
      >
        {set.name}
      </button>
      <div className="text-[10px] text-ink-3 mb-2">
        {itemCount} từ · Học gần nhất:{" "}
        {set.lastStudiedAt ? formatDate(set.lastStudiedAt) : "chưa học"}
      </div>

      <div className="h-1 bg-background rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${reviewShare}%`,
            background: "linear-gradient(90deg, var(--primary), var(--coral))",
          }}
        />
      </div>

      <div className="text-[10px] font-medium text-ink-3 mb-2">
        Mới {progress.new} · Đang học {progress.learning} · Đang ôn {progress.review} · Học lại{" "}
        {progress.relearning}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <button
          type="button"
          onClick={() => onOpen(set.id)}
          className="text-[10px] font-semibold text-muted-foreground cursor-pointer hover:text-indigo-hover"
        >
          Xem từ
        </button>
        <Link
          to={`/review?setId=${set.id}`}
          className="text-[10px] font-semibold text-primary hover:underline"
        >
          Ôn tập →
        </Link>
      </div>
    </div>
  );
}

function SetCardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-border rounded-2xl p-5 animate-pulse"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-muted" />
            <div className="w-14 h-3 rounded bg-muted" />
          </div>
          <div className="w-3/4 h-4 rounded bg-muted mb-3" />
          <div className="h-1 bg-muted rounded-full mb-2" />
          <div className="h-2.5 w-1/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
