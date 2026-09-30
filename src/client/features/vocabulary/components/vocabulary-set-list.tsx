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
  { bg: "#ECEAFB", color: "#5A4FE0" },
  { bg: "#FCE7E1", color: "#C8442B" },
  { bg: "#DDF3E7", color: "#1E7A4B" },
  { bg: "#FBEFD8", color: "#A66A12" },
  { bg: "#E8F4FF", color: "#2A6FDB" },
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
        <span className="text-xs text-[#565160]">
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
            className="h-9 w-44 text-xs border-[#EAE5DB] rounded-xl focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/10"
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
                className="h-9 w-16 text-xs border-[#EAE5DB] rounded-xl focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/10"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!newSetName.trim() || generating}
                onClick={handleGenerate}
                className="h-9 rounded-xl gap-1.5 border-[#EAE5DB] hover:border-[#5A4FE0] hover:text-[#4A3FD0]"
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
          className="group flex flex-col items-center justify-center gap-3 min-h-[168px] rounded-2xl border-2 border-dashed border-[#DAD4C8] cursor-pointer text-[#908B98] font-semibold text-sm transition-all hover:border-[#5A4FE0] hover:text-[#5A4FE0] hover:bg-[#5A4FE0]/3"
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
      className="group flex flex-col min-h-[168px] bg-white border border-[#EAE5DB] rounded-2xl p-5 transition-all hover:border-[#5A4FE0] hover:shadow-md hover:-translate-y-0.5"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: col.bg }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={col.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              ? { background: "#DDF3E7", color: "#1E7A4B" }
              : { background: "#F0EDE8", color: "#908B98" }
          }
        >
          {set.studiedToday ? "Hôm nay đã học" : "Hôm nay chưa học"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpen(set.id)}
        className="block w-full text-left text-sm font-bold text-[#221F2B] mb-0.5 leading-snug line-clamp-2 cursor-pointer hover:text-[#4A3FD0]"
      >
        {set.name}
      </button>
      <div className="text-[10px] text-[#908B98] mb-2">
        {itemCount} từ · Học gần nhất:{" "}
        {set.lastStudiedAt ? formatDate(set.lastStudiedAt) : "chưa học"}
      </div>

      <div className="h-1 bg-[#F5F2EC] rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${reviewShare}%`,
            background: "linear-gradient(90deg, #5A4FE0, #F2664A)",
          }}
        />
      </div>

      <div className="text-[10px] font-medium text-[#908B98] mb-2">
        Mới {progress.new} · Đang học {progress.learning} · Đang ôn {progress.review} · Học lại{" "}
        {progress.relearning}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <button
          type="button"
          onClick={() => onOpen(set.id)}
          className="text-[10px] font-semibold text-[#565160] cursor-pointer hover:text-[#4A3FD0]"
        >
          Xem từ
        </button>
        <Link
          to={`/review?setId=${set.id}`}
          className="text-[10px] font-semibold text-[#5A4FE0] hover:underline"
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
          className="bg-white border border-[#EAE5DB] rounded-2xl p-5 animate-pulse"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0EDE8]" />
            <div className="w-14 h-3 rounded bg-[#F0EDE8]" />
          </div>
          <div className="w-3/4 h-4 rounded bg-[#F0EDE8] mb-3" />
          <div className="h-1 bg-[#F0EDE8] rounded-full mb-2" />
          <div className="h-2.5 w-1/3 rounded bg-[#F0EDE8]" />
        </div>
      ))}
    </div>
  );
}
