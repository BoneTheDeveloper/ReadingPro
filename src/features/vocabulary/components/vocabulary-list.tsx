"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VocabularyItemDto, VocabularyStatus } from "../schemas/vocabulary";

interface VocabularyListProps {
  items: VocabularyItemDto[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  statusFilter: VocabularyStatus | "ALL";
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (status: VocabularyStatus | "ALL") => void;
  onPageChange: (page: number) => void;
  onStatusChange: (id: string, status: VocabularyStatus) => void;
  onDelete: (id: string) => void;
}

const STATUS_FILTERS: Array<"ALL" | VocabularyStatus> = [
  "ALL",
  "NEW",
  "LEARNING",
  "MASTERED",
];

const STATUS_STYLE: Record<
  VocabularyStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  NEW: { label: "New", bg: "#FBEFD8", color: "#A66A12", dot: "#EEA63C" },
  LEARNING: {
    label: "Learning",
    bg: "#ECEAFB",
    color: "#4A3FD0",
    dot: "#5A4FE0",
  },
  MASTERED: { label: "Known", bg: "#DDF3E7", color: "#1E7A4B", dot: "#2FA66A" },
};

const FILTER_CHIP_BASE =
  "px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all";
const FILTER_CHIP_OFF =
  "bg-white text-[#565160] border-[#EAE5DB] hover:border-[#5A4FE0] hover:text-[#4A3FD0]";
const FILTER_CHIP_ON = "bg-[#5A4FE0] text-white border-[#5A4FE0]";

export function VocabularyList({
  items,
  total,
  page,
  pageSize,
  search,
  statusFilter,
  loading,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onStatusChange,
  onDelete,
}: VocabularyListProps) {
  const t = useTranslations("Vocabulary");
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#908B98] pointer-events-none" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs w-52 border-[#EAE5DB] rounded-xl focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/10"
          />
        </div>

        {/* Filter chips */}
        {STATUS_FILTERS.map((status) => {
          const active = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              className={cn(
                FILTER_CHIP_BASE,
                active ? FILTER_CHIP_ON : FILTER_CHIP_OFF,
              )}
              onClick={() => onStatusFilterChange(status)}
            >
              {status === "ALL"
                ? t("allWords")
                : status === "NEW"
                  ? t("new")
                  : status === "LEARNING"
                    ? t("learning")
                    : t("mastered")}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 border-[#EAE5DB] rounded-xl hover:border-[#5A4FE0] hover:text-[#4A3FD0]"
        >
          <Download className="size-3.5" />
          {t("export")}
        </Button>

        {/* Add word */}
        <Button
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          {t("addWord")}
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE5DB] rounded-2xl overflow-hidden shadow-sm">
        {/* Table header */}
        <div
          className="flex items-center px-4 py-2.5 bg-[#FBF9F5] border-b border-[#EAE5DB] sticky top-0 z-10"
          style={{ gap: "0" }}
        >
          <div className="w-36 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Word
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Definition
            </span>
          </div>
          <div className="w-16 shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Level
            </span>
          </div>
          <div className="w-24 shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Status
            </span>
          </div>
          <div className="w-20 shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Saved
            </span>
          </div>
          <div className="w-16 shrink-0" />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <EmptyVocabularyState />
        ) : (
          items.map((item) => (
            <TableRow
              key={item.id}
              item={item}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          filter={statusFilter}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

function TableRow({
  item,
  onStatusChange,
  onDelete,
}: {
  item: VocabularyItemDto;
  onStatusChange: (id: string, status: VocabularyStatus) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("Vocabulary");
  const [hovered, setHovered] = useState(false);
  const isMastered = item.status === "MASTERED";

  const statusStyle = STATUS_STYLE[item.status as VocabularyStatus];

  const savedDate = item.createdAt
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(item.createdAt))
    : "—";

  return (
    <div
      className="flex items-center px-4 py-3 border-b border-[#EAE5DB] last:border-b-0 transition-colors"
      style={{
        background: hovered ? "#FAFAF4" : "#fff",
        gap: "0",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Word */}
      <div className="w-36 shrink-0">
        <span className="text-sm font-semibold text-[#221F2B]">
          {item.displayText}
        </span>
      </div>

      {/* Definition */}
      <div className="flex-1 min-w-0 pr-4">
        <span
          className="text-xs text-[#565160] block truncate"
          title={item.translation}
        >
          {item.translation}
        </span>
      </div>

      {/* Level (hardcoded dash — DB has no level field) */}
      <div className="w-16 shrink-0 text-center">
        <span className="inline-flex items-center rounded-full bg-[#F5F2EC] px-2.5 py-0.5 text-[10px] font-bold text-[#908B98]">
          —
        </span>
      </div>

      {/* Status */}
      <div className="w-24 shrink-0 text-center">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: statusStyle.dot }}
          />
          {statusStyle.label}
        </span>
      </div>

      {/* Saved date */}
      <div className="w-20 shrink-0 text-center">
        <span className="text-xs text-[#908B98]">{savedDate}</span>
      </div>

      {/* Actions (visible on hover) */}
      <div
        className="w-16 shrink-0 flex gap-1.5 justify-end"
        style={{
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 120ms",
        }}
      >
        {/* Toggle known/learning */}
        <button
          type="button"
          title={isMastered ? t("markLearning") : t("markMastered")}
          onClick={() =>
            onStatusChange(item.id, isMastered ? "LEARNING" : "MASTERED")
          }
          className="flex items-center justify-center size-7 rounded-xl border transition-all cursor-pointer"
          style={{
            borderColor: isMastered ? "#EAE5DB" : "#CFEEDD",
            background: isMastered ? "#fff" : "#DDF3E7",
            color: isMastered ? "#908B98" : "#1E7A4B",
          }}
        >
          {isMastered ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>

        {/* Delete */}
        <button
          type="button"
          title={t("delete")}
          onClick={() => onDelete(item.id)}
          className="flex items-center justify-center size-7 rounded-xl border border-[#EAE5DB] bg-white text-[#908B98] transition-all cursor-pointer hover:border-[#F2664A] hover:text-[#C8442B]"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EmptyVocabularyState() {
  const t = useTranslations("Vocabulary");

  return (
    <div className="py-14 text-center">
      <div className="flex justify-center mb-4 opacity-30">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#221F2B"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m16 6 4 14" />
          <path d="M12 6v14" />
          <path d="M8 8v12" />
          <path d="M4 4v16" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-[#565160] mb-1.5">
        {t("emptyTitle")}
      </p>
      <p className="text-xs text-[#908B98]">{t("emptyDescription")}</p>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  total,
  filter,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  filter: VocabularyStatus | "ALL";
  onPageChange: (page: number) => void;
}) {
  const filterSuffix = filter !== "ALL" ? ` (${filter})` : "";

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#908B98]">
        {total} words{filterSuffix} · Page {page} of {totalPages}
      </span>
      <div className="flex gap-1.5">
        {/* Prev */}
        <button
          type="button"
          className="flex items-center justify-center size-8 rounded-xl border border-[#EAE5DB] bg-white text-[#908B98] hover:border-[#5A4FE0] hover:text-[#4A3FD0] transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex items-center justify-center size-8 text-xs text-[#908B98]"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={cn(
                "flex items-center justify-center size-8 rounded-xl text-xs font-semibold transition-all",
                p === page
                  ? "bg-[#5A4FE0] text-white border border-[#5A4FE0] shadow-sm"
                  : "border border-[#EAE5DB] bg-white text-[#565160] hover:border-[#5A4FE0] hover:text-[#4A3FD0]",
              )}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          className="flex items-center justify-center size-8 rounded-xl border border-[#EAE5DB] bg-white text-[#908B98] hover:border-[#5A4FE0] hover:text-[#4A3FD0] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  if (current > 3) pages.push("…");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-[#EAE5DB]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center px-4 py-3 gap-4 animate-pulse"
        >
          <div className="w-28 h-3.5 rounded bg-[#F0EDE8]" />
          <div className="flex-1 h-3 rounded bg-[#F0EDE8]" />
          <div className="w-12 h-5 rounded-full bg-[#F0EDE8]" />
          <div className="w-20 h-5 rounded-full bg-[#F0EDE8]" />
          <div className="w-16 h-3 rounded bg-[#F0EDE8]" />
          <div className="w-10" />
        </div>
      ))}
    </div>
  );
}
