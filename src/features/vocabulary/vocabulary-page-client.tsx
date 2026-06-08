"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Library } from "lucide-react";
import { VocabularyList } from "./vocabulary-list";
import { VocabularySetList } from "./vocabulary-set-list";
import { PageTabButton, PageErrorState } from "./vocabulary-page-ui";
import { useVocabularyList } from "./use-vocabulary-list";
import { useVocabularySets } from "./use-vocabulary-sets";
import type {
  VocabularyStatus,
  VocabularySet,
} from "./vocabulary-types";

type ViewTab = "words" | "sets";

export function VocabularyPageClient() {
  const t = useTranslations("Vocabulary");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VocabularyStatus | "ALL">("ALL");
  const [activeTab, setActiveTab] = useState<ViewTab>("words");
  const [creating, setCreating] = useState(false);

  const {
    items, total, loading: listLoading, error: listError, refetch: refetchList,
  } = useVocabularyList(page, statusFilter, search);

  const {
    sets, loading: setsLoading, error: setsError, refetch: refetchSets,
  } = useVocabularySets(activeTab === "sets");

  const handleStatusChange = useCallback(async (id: string, status: VocabularyStatus) => {
    try {
      const res = await fetch(`/api/vocabulary/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      refetchList();
    } catch { /* item keeps current status */ }
  }, [refetchList]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      refetchList();
    } catch { /* item stays */ }
  }, [refetchList]);

  const handleCreateSet = useCallback(async (name: string) => {
    setCreating(true);
    try {
      const res = await fetch("/api/vocabulary/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Create set failed");
      const json: unknown = await res.json();
      const data = json as { success: true; data: VocabularySet };
      // Optimistically prepend the new set
      void data;
      refetchSets();
    } catch { /* silently fail */ }
    finally { setCreating(false); }
  }, [refetchSets]);

  const handleDeleteSet = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vocabulary/sets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete set failed");
      refetchSets();
    } catch { /* silently fail */ }
  }, [refetchSets]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        <PageTabButton active={activeTab === "words"} onClick={() => setActiveTab("words")}>
          <BookOpen className="size-3.5" />
          {t("wordsTab")}
        </PageTabButton>
        <PageTabButton active={activeTab === "sets"} onClick={() => setActiveTab("sets")}>
          <Library className="size-3.5" />
          {t("setsTab")}
        </PageTabButton>
      </div>

      {activeTab === "words" &&
        (listError ? (
          <PageErrorState message={listError} onRetry={refetchList} retryLabel={t("retry")} />
        ) : (
          <VocabularyList
            items={items} total={total} page={page} pageSize={20}
            search={search} statusFilter={statusFilter} loading={listLoading}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            onStatusFilterChange={(s) => { setStatusFilter(s); setPage(1); }}
            onPageChange={setPage}
            onStatusChange={handleStatusChange} onDelete={handleDelete}
          />
        ))}

      {activeTab === "sets" &&
        (setsError ? (
          <PageErrorState message={setsError} onRetry={refetchSets} retryLabel={t("retry")} />
        ) : (
          <VocabularySetList
            sets={sets} loading={setsLoading}
            onCreateSet={handleCreateSet} onDeleteSet={handleDeleteSet}
            creating={creating}
          />
        ))}
    </div>
  );
}
