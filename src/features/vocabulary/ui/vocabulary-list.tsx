"use client";

import { useTranslations } from "next-intl";
import { BookOpen, Search } from "lucide-react";
import { Input } from "@/ui/primitives/input";
import { cn } from "@/ui/utils";
import { VocabularyItemCard } from "./vocabulary-item-card";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "../model/vocabulary-types";

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
  onStatusChange: (id: string, status: VocabularyStatus) => void;
  onDelete: (id: string) => void;
}

const STATUS_FILTERS: Array<"ALL" | VocabularyStatus> = [
  "ALL",
  "NEW",
  "LEARNING",
  "MASTERED",
];

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

  if (loading) {
    return <VocabularyListSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === status
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onStatusFilterChange(status)}
          >
            {t(
              status === "ALL"
                ? "allWords"
                : (status.toLowerCase() as Lowercase<VocabularyStatus>),
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <VocabularyItemCard
              key={item.id}
              item={item}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyVocabularyState />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <PaginationButton
            label={t("previous")}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
          <span className="text-xs text-muted-foreground">
            {t("pageInfo", { current: page, total: totalPages })}
          </span>
          <PaginationButton
            label={t("next")}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      )}
    </div>
  );
}

function EmptyVocabularyState() {
  const t = useTranslations("Vocabulary");

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <BookOpen className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("emptyTitle")}
        </p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </div>
    </div>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function VocabularyListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border bg-card p-4 space-y-3"
        >
          <div className="h-4 w-2/5 rounded bg-muted" />
          <div className="h-3 w-3/5 rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-5 w-12 rounded-full bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
