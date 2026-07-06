"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Library } from "lucide-react";
import { VocabularyList } from "./vocabulary-list";
import { VocabularySetList } from "./vocabulary-set-list";
import { PageErrorState } from "./vocabulary-page-ui";
import { useVocabularyList } from "../hooks/use-vocabulary-list";
import { useVocabularySets } from "../hooks/use-vocabulary-sets";
import { useVocabularyStats } from "../hooks/use-vocabulary-stats";
import {
  updateVocabularyItemStatus,
  deleteVocabularyItem,
  createVocabularySet,
  deleteVocabularySet,
} from "../vocabulary-client";
import type { VocabularyStatus } from "../model/vocabulary-response.schema";

type ViewTab = "words" | "sets";

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

export function VocabularyPageClient() {
  const t = useTranslations("Vocabulary");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VocabularyStatus | "ALL">("ALL");
  const [activeTab, setActiveTab] = useState<ViewTab>("words");
  const [creating, setCreating] = useState(false);

  const {
    stats, loading: statsLoading, error: statsError, refetch: refetchStats,
  } = useVocabularyStats();

  const {
    items, total, loading: listLoading, error: listError, refetch: refetchList,
  } = useVocabularyList(page, statusFilter, search);

  const {
    sets, loading: setsLoading, error: setsError, refetch: refetchSets,
  } = useVocabularySets(activeTab === "sets");

  const handleStatusChange = useCallback(async (id: string, status: VocabularyStatus) => {
    try {
      await updateVocabularyItemStatus(id, status);
      refetchList();
      refetchStats();
    } catch { /* item keeps current status */ }
  }, [refetchList, refetchStats]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteVocabularyItem(id);
      refetchList();
      refetchStats();
    } catch { /* item stays */ }
  }, [refetchList, refetchStats]);

  const handleCreateSet = useCallback(async (name: string) => {
    setCreating(true);
    try {
      await createVocabularySet(name);
      refetchSets();
    } catch { /* silently fail */ }
    finally { setCreating(false); }
  }, [refetchSets]);

  const handleDeleteSet = useCallback(async (id: string) => {
    try {
      await deleteVocabularySet(id);
      refetchSets();
    } catch { /* silently fail */ }
  }, [refetchSets]);

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

        {/* Stats row */}
        {!statsLoading && !statsError ? (
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
        ) : statsError ? (
          <div className="mb-8">
            <PageErrorState
              message={statsError}
              onRetry={refetchStats}
              retryLabel={t("retry")}
            />
          </div>
        ) : (
          <div
            className="grid gap-3 mb-8"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[88px] bg-white border border-[#EAE5DB] rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

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

        {/* Words tab */}
        {activeTab === "words" &&
          (listError ? (
            <PageErrorState message={listError} onRetry={refetchList} retryLabel={t("retry")} />
          ) : (
            <VocabularyList
              items={items}
              total={total}
              page={page}
              pageSize={20}
              search={search}
              statusFilter={statusFilter}
              loading={listLoading}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              onStatusFilterChange={(s) => { setStatusFilter(s); setPage(1); }}
              onPageChange={setPage}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}

        {/* Sets tab */}
        {activeTab === "sets" &&
          (setsError ? (
            <PageErrorState message={setsError} onRetry={refetchSets} retryLabel={t("retry")} />
          ) : (
            <VocabularySetList
              sets={sets}
              loading={setsLoading}
              onCreateSet={handleCreateSet}
              onDeleteSet={handleDeleteSet}
              creating={creating}
            />
          ))}
      </div>
    </div>
  );
}
