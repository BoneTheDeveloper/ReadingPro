"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import type { VocabularySet } from "../model/vocabulary-types";

interface VocabularySetListProps {
  sets: VocabularySet[];
  loading: boolean;
  onCreateSet: (name: string) => void;
  onDeleteSet: (id: string) => void;
  creating: boolean;
}

const SET_COLORS = [
  { bg: "#ECEAFB", color: "#5A4FE0" },
  { bg: "#FCE7E1", color: "#C8442B" },
  { bg: "#DDF3E7", color: "#1E7A4B" },
  { bg: "#FBEFD8", color: "#A66A12" },
  { bg: "#E8F4FF", color: "#2A6FDB" },
];

export function VocabularySetList({
  sets,
  loading,
  onCreateSet,
  onDeleteSet,
  creating,
}: VocabularySetListProps) {
  const t = useTranslations("Vocabulary");
  const [newSetName, setNewSetName] = useState("");

  const handleCreate = useCallback(() => {
    const trimmed = newSetName.trim();
    if (!trimmed) return;
    onCreateSet(trimmed);
    setNewSetName("");
  }, [newSetName, onCreateSet]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleCreate();
    },
    [handleCreate],
  );

  if (loading) return <SetCardGridSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#565160]">
          {t("setsInLibrary", { count: sets.length })}
        </span>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("newSetName")}
            value={newSetName}
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
            {t("newSet")}
          </Button>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set, i) => (
          <SetCard key={set.id} set={set} colorIndex={i} />
        ))}

        {/* Add new set card */}
        <button
          type="button"
          className="group flex flex-col items-center justify-center gap-3 min-h-[168px] rounded-2xl border-2 border-dashed border-[#DAD4C8] cursor-pointer text-[#908B98] font-semibold text-sm transition-all hover:border-[#5A4FE0] hover:text-[#5A4FE0] hover:bg-[#5A4FE0]/3"
          onClick={() => {
            /* TODO: open create set modal */
          }}
        >
          <div className="w-9 h-9 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
            <Plus className="size-4" strokeWidth={2.2} />
          </div>
          {t("newSet")}
        </button>
      </div>
    </div>
  );
}

function SetCard({
  set,
  colorIndex,
}: {
  set: VocabularySet;
  colorIndex: number;
}) {
  const t = useTranslations("Vocabulary");
  const col = SET_COLORS[colorIndex % SET_COLORS.length];
  const itemCount = set._count.items;

  // Hardcoded knownCount — DB has no mastered-per-set count
  // TODO: add mastered count per set to enable real progress
  const knownCount = Math.min(itemCount, Math.floor(itemCount * 0.3));
  const progress =
    itemCount > 0 ? Math.round((knownCount / itemCount) * 100) : 0;

  return (
    <div
      className="group bg-white border border-[#EAE5DB] rounded-2xl p-5 cursor-pointer transition-all hover:border-[#5A4FE0] hover:shadow-md hover:-translate-y-0.5"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04)",
      }}
    >
      {/* Icon + count */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: col.bg }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={col.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 6 4 14" />
            <path d="M12 6v14" />
            <path d="M8 8v12" />
            <path d="M4 4v16" />
          </svg>
        </div>
        <span className="text-xs text-[#908B98] font-medium pt-0.5">
          {itemCount} {itemCount === 1 ? "word" : "words"}
        </span>
      </div>

      {/* Name */}
      <div className="text-sm font-bold text-[#221F2B] mb-1.5 leading-snug line-clamp-2">
        {set.name}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#F5F2EC] rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #5A4FE0, #F2664A)",
          }}
        />
      </div>

      {/* Progress label + CTA */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#908B98]">
          {knownCount}/{itemCount} known
        </span>
        <span className="text-[10px] font-semibold text-[#5A4FE0]">
          Study →
        </span>
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
