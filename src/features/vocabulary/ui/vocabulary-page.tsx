"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Library } from "lucide-react";
import { VocabularyList } from "./vocabulary-list";
import { VocabularySetList } from "./vocabulary-set-list";
import {
  updateVocabularyStatusAction,
  deleteVocabularyItemAction,
  createVocabularySetAction,
  deleteVocabularySetAction,
} from "../actions";
import type {
  VocabularyStatus,
  VocabularyItemDto,
  VocabularyStatsDto,
  VocabularySetDto,
} from "../schemas/vocabulary.schema";

type ViewTab = "words" | "sets";

interface VocabularyPageClientProps {
  initialList: VocabularyItemDto[];
  initialTotal: number;
  initialStats: VocabularyStatsDto;
  initialSets: VocabularySetDto[];
}

const TAB_BASE =
  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer";
const TAB_ON = "bg-[#5A4FE0] text-white shadow-sm";

// Stats card component
function StatCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: number;
  sublabel: string;
  accent: string;
}) {
  return (
    <div
      className="relative bg-white border rounded-lg px-5 py-4 overflow-hidden shadow-sm"
      style={{
        borderColor: `${accent}30`,
        boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04)",
      }}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-1"
        style={{ background: accent }}
      />
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className="text-3xl font-extrabold text-[#221F2B] leading-none mb-1">
        {value}
      </div>
      <div className="text-xs text-[#908B98]">{sublabel}</div>
    </div>
  );
}

export function VocabularyPageClient({
  initialList,
  initialTotal,
  initialStats,
  initialSets,
}: VocabularyPageClientProps) {
  const t = useTranslations("Vocabulary");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VocabularyStatus | "ALL">(
    "ALL",
  );
  const [activeTab, setActiveTab] = useState<ViewTab>("words");
  const [creating, setCreating] = useState(false);

  // Server-fetched initial data (no loading state - data already loaded)
  const [items, setItems] = useState(initialList);
  const [total] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [sets, setSets] = useState(initialSets);

  const handleStatusChange = useCallback(
    async (id: string, status: VocabularyStatus) => {
      try {
        const result = await updateVocabularyStatusAction({
          itemId: id,
          status,
        });
        if (!result.success) throw new Error("Failed to update status");
      } catch {
        /* item keeps current status */
      }
    },
    [],
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      const result = await deleteVocabularyItemAction(id);
      if (!result.success) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setStats((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch {
      /* item stays */
    }
  }, []);

  const handleCreateSet = useCallback(async (name: string) => {
    setCreating(true);
    try {
      const result = await createVocabularySetAction({ name });
      if (!result.success) throw new Error("Failed to create set");
    } catch {
      /* silently fail */
    } finally {
      setCreating(false);
    }
  }, []);

  const handleDeleteSet = useCallback(async (id: string) => {
    try {
      const result = await deleteVocabularySetAction({ setId: id });
      if (!result.success) throw new Error("Failed to delete set");
      setSets((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* silently fail */
    }
  }, []);

  const wOn = activeTab === "words";
  const sOn = activeTab === "sets";

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F2EC]">
      <div className="mx-auto max-w-[1020px] px-10 py-10 pb-16">
        {/* Page header */}
        <div className="mb-7">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#221F2B] mb-1">
            {t("pageTitle")}
          </h1>
          <p className="text-sm text-[#565160] leading-relaxed">
            {t("pageDescription")}
          </p>
        </div>

        {/* Stats row - server-fetched, no loading state */}
        <div
          className="grid gap-3 mb-8"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        >
          <StatCard
            label={t("total")}
            value={stats.total}
            sublabel={t("totalWordsSaved")}
            accent="#221F2B"
          />
          <StatCard
            label={t("newWords")}
            value={stats.new}
            sublabel={t("notStudiedYet")}
            accent="#EEA63C"
          />
          <StatCard
            label={t("learningWords")}
            value={stats.learning}
            sublabel={t("inProgress")}
            accent="#5A4FE0"
          />
          <StatCard
            label={t("known")}
            value={stats.known}
            sublabel={t("masteredWords")}
            accent="#2FA66A"
          />
        </div>

        {/* Tab control */}
        <div className="flex bg-white border border-[#EAE5DB] rounded-xl p-0.5 max-w-xs mb-6">
          <button
            type="button"
            className={`${TAB_BASE} ${wOn ? TAB_ON : ""}`}
            onClick={() => setActiveTab("words")}
          >
            <BookOpen className="size-3.5" strokeWidth={2} />
            {t("wordsTab")}
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: wOn ? "rgba(255,255,255,0.25)" : "#F0EDE8",
                color: wOn ? "#fff" : "#908B98",
              }}
            >
              {stats.total}
            </span>
          </button>
          <button
            type="button"
            className={`${TAB_BASE} ${sOn ? TAB_ON : ""}`}
            onClick={() => setActiveTab("sets")}
          >
            <Library className="size-3.5" strokeWidth={2} />
            {t("setsTab")}
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: sOn ? "rgba(255,255,255,0.25)" : "#F0EDE8",
                color: sOn ? "#fff" : "#908B98",
              }}
            >
              {sets.length}
            </span>
          </button>
        </div>

        {/* Words tab - server-fetched */}
        {activeTab === "words" && (
          <VocabularyList
            items={items}
            total={total}
            page={page}
            pageSize={20}
            search={search}
            statusFilter={statusFilter}
            loading={false}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            onStatusFilterChange={(s) => {
              setStatusFilter(s);
              setPage(1);
            }}
            onPageChange={setPage}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}

        {/* Sets tab - server-fetched */}
        {activeTab === "sets" && (
          <VocabularySetList
            sets={sets}
            loading={false}
            onCreateSet={handleCreateSet}
            onDeleteSet={handleDeleteSet}
            creating={creating}
          />
        )}
      </div>
    </div>
  );
}
