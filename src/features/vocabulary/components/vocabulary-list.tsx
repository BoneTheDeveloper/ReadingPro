"use client";

import { useState } from "react";
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

const STATUS_LABEL: Record<VocabularyStatus | "ALL", string> = {
  ALL: "Tất cả",
  NEW: "Mới",
  LEARNING: "Đang học",
  MASTERED: "Đã thuộc",
};

const STATUS_STYLE: Record<
  VocabularyStatus,
  { bg: string; color: string; dot: string }
> = {
  NEW: { bg: "#FBEFD8", color: "#A66A12", dot: "#EEA63C" },
  LEARNING: { bg: "#ECEAFB", color: "#4A3FD0", dot: "#5A4FE0" },
  MASTERED: { bg: "#DDF3E7", color: "#1E7A4B", dot: "#2FA66A" },
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
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#908B98] pointer-events-none" />
          <Input
            placeholder="Tìm từ..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs w-52 border-[#EAE5DB] rounded-xl focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/10"
          />
        </div>

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
              {STATUS_LABEL[status]}
            </button>
          );
        })}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 border-[#EAE5DB] rounded-xl hover:border-[#5A4FE0] hover:text-[#4A3FD0]"
        >
          <Download className="size-3.5" />
          Xuất
        </Button>

        <Button
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Thêm từ
        </Button>
      </div>

      <div className="bg-white border border-[#EAE5DB] rounded-2xl overflow-hidden shadow-sm">
        <div
          className="flex items-center px-4 py-2.5 bg-[#FBF9F5] border-b border-[#EAE5DB] sticky top-0 z-10"
          style={{ gap: "0" }}
        >
          <div className="w-36 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Từ
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Nghĩa
            </span>
          </div>
          <div className="w-16 shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Cấp
            </span>
          </div>
          <div className="w-24 shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Trạng thái
            </span>
          </div>
          <div className="w-20 shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Lưu
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
  const [hovered, setHovered] = useState(false);
  const isMastered = item.status === "MASTERED";
  const statusStyle = STATUS_STYLE[item.status as VocabularyStatus];
  const STATUS_LABELS: Record<VocabularyStatus, string> = {
    NEW: "Mới",
    LEARNING: "Đang học",
    MASTERED: "Đã thuộc",
  };

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
      <div className="w-36 shrink-0">
        <span className="text-sm font-semibold text-[#221F2B]">
          {item.displayText}
        </span>
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <span
          className="text-xs text-[#565160] block truncate"
          title={item.translation}
        >
          {item.translation}
        </span>
      </div>

      <div className="w-16 shrink-0 text-center">
        <span className="inline-flex items-center rounded-full bg-[#F5F2EC] px-2.5 py-0.5 text-[10px] font-bold text-[#908B98]">
          —
        </span>
      </div>

      <div className="w-24 shrink-0 text-center">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: statusStyle.dot }}
          />
          {STATUS_LABELS[item.status as VocabularyStatus]}
        </span>
      </div>

      <div className="w-20 shrink-0 text-center">
        <span className="text-xs text-[#908B98]">{savedDate}</span>
      </div>

      <div
        className="w-16 shrink-0 flex gap-1.5 justify-end"
        style={{
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 120ms",
        }}
      >
        <button
          type="button"
          title={isMastered ? "Đánh dấu Đang học" : "Đánh dấu Đã thuộc"}
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>

        <button
          type="button"
          title="Xóa"
          onClick={() => onDelete(item.id)}
          className="flex items-center justify-center size-7 rounded-xl border border-[#EAE5DB] bg-white text-[#908B98] transition-all cursor-pointer hover:border-[#F2664A] hover:text-[#C8442B]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EmptyVocabularyState() {
  return (
    <div className="py-14 text-center">
      <div className="flex justify-center mb-4 opacity-30">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#221F2B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 6 4 14" />
          <path d="M12 6v14" />
          <path d="M8 8v12" />
          <path d="M4 4v16" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-[#565160] mb-1.5">
        Chưa có từ vựng
      </p>
      <p className="text-xs text-[#908B98]">
        Lưu từ trong không gian học tập để xây dựng danh sách từ vựng tại đây.
      </p>
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
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#908B98]">
        {total} từ
      </span>
      <div className="flex gap-1">
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-semibold transition-colors",
                p === page
                  ? "bg-[#5A4FE0] text-white"
                  : "text-[#565160] hover:bg-[#F5F2EC]",
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-[#EAE5DB]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3 gap-4">
          <div className="w-36 h-4 bg-[#F0EDE8] rounded animate-pulse" />
          <div className="flex-1 h-4 bg-[#F0EDE8] rounded animate-pulse" />
          <div className="w-16 h-4 bg-[#F0EDE8] rounded animate-pulse" />
          <div className="w-24 h-4 bg-[#F0EDE8] rounded animate-pulse" />
          <div className="w-20 h-4 bg-[#F0EDE8] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
