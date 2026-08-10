"use client";

import { Download, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/component/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PartOfSpeech, VocabularyStatus } from "@/generated/prisma/enums";
import type { VocabularyItem } from "@/features/vocabulary/schema";

interface VocabularyListProps {
  items: VocabularyItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  statusFilter: VocabularyStatus | "ALL";
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (status: VocabularyStatus | "ALL") => void;
  onPageChange: (page: number) => void;
  onAddClick: () => void;
  onEdit: (item: VocabularyItem) => void;
  onDelete: (id: string) => void;
}

const STATUS_FILTERS: Array<"ALL" | VocabularyStatus> = [
  "ALL",
  "NEW",
  "LEARNING",
  "MEMORIZED",
];

const STATUS_LABEL: Record<VocabularyStatus | "ALL", string> = {
  ALL: "Tất cả",
  NEW: "Mới",
  LEARNING: "Đang học",
  MEMORIZED: "Đã thuộc",
};

const STATUS_STYLE: Record<
  VocabularyStatus,
  { bg: string; color: string; dot: string }
> = {
  NEW: { bg: "#FBEFD8", color: "#A66A12", dot: "#EEA63C" },
  LEARNING: { bg: "#ECEAFB", color: "#4A3FD0", dot: "#5A4FE0" },
  MEMORIZED: { bg: "#DDF3E7", color: "#1E7A4B", dot: "#2FA66A" },
};

const POS_LABEL: Record<Exclude<PartOfSpeech, "OTHER">, string> = {
  NOUN: "danh từ",
  VERB: "động từ",
  ADJECTIVE: "tính từ",
  ADVERB: "trạng từ",
  PREPOSITION: "giới từ",
  CONJUNCTION: "liên từ",
  PHRASE: "cụm từ",
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
  onAddClick,
  onEdit,
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
          onClick={onAddClick}
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
          <div className="w-24 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Loại từ
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
              Nghĩa
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
              onEdit={onEdit}
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
  onEdit,
  onDelete,
}: {
  item: VocabularyItem;
  onEdit: (item: VocabularyItem) => void;
  onDelete: (id: string) => void;
}) {
  const statusStyle = STATUS_STYLE[item.learningstatus];

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
      style={{ gap: "0" }}
    >
      <div className="w-36 shrink-0">
        <span className="text-sm font-semibold text-[#221F2B]">
          {item.term}
        </span>
      </div>

      <div className="w-24 shrink-0 pr-2">
        {item.partofSpeech === "OTHER" ? (
          <span className="text-xs text-[#908B98]">—</span>
        ) : (
          <span className="text-xs text-[#565160]">
            {POS_LABEL[item.partofSpeech]}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <span
          className="text-xs text-[#565160] block truncate"
          title={item.translation}
        >
          {item.translation}
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
          {STATUS_LABEL[item.learningstatus]}
        </span>
      </div>

      <div className="w-20 shrink-0 text-center">
        <span className="text-xs text-[#908B98]">{savedDate}</span>
      </div>

      <div className="w-16 shrink-0 flex items-center justify-end pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Tác vụ"
              aria-label="Tác vụ"
              aria-haspopup="menu"
              className="relative flex items-center justify-center size-9 rounded-xl border border-[#EAE5DB] bg-white text-[#565160] transition-colors cursor-pointer hover:border-[#5A4FE0] hover:text-[#4A3FD0] focus-visible:ring-2 focus-visible:ring-[#5A4FE0]/40 focus-visible:outline-none before:content-[''] before:absolute before:inset-y-[-6px] before:left-[-6px] before:right-[-6px]"
            >
              <MoreVertical className="size-[15px]" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem
              onSelect={() => onEdit(item)}
              className="text-[#221F2B]"
            >
              <Pencil className="size-3.5 text-[#565160]" />
              Sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(item.id)}
              className="text-[#C8442B] focus:bg-[#FCEAE3] focus:text-[#C8442B]"
            >
              <Trash2 className="size-3.5 text-[#C8442B]" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
