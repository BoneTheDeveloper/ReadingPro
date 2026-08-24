"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Library } from "lucide-react";
import { VocabularyList } from "./vocabulary-list";
import { VocabularySetList } from "./vocabulary-set-list";
import { VocabularyFormDialog } from "./vocabulary-form-dialog";
import { vocabularyQueries } from "@/features/vocabulary/api/queries";
import {
  useCreateVocabularyMutation,
  useDeleteVocabularyMutation,
  useUpdateVocabularyMutation,
} from "@/features/vocabulary/api/mutations";
import { VocabularyStatus } from "@/generated/prisma/enums";
import type { VocabularyItem, VocabularySet } from "@/features/vocabulary/schema";


type ViewTab = "words" | "sets";

const TAB_BASE =
  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer";
const TAB_ON = "bg-[#5A4FE0] text-white shadow-sm";

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

const STAT_CONFIG: Array<{
  key: keyof import("@/features/vocabulary/schema").VocabularyStats;
  label: string;
  sublabel: string;
  accent: string;
}> = [
  { key: "total", label: "Tổng", sublabel: "từ đã lưu", accent: "#221F2B" },
  { key: "new", label: "Mới", sublabel: "chưa học", accent: "#EEA63C" },
  { key: "learning", label: "Đang học", sublabel: "đang tiến", accent: "#5A4FE0" },
  { key: "known", label: "Đã biết", sublabel: "đã thuộc", accent: "#2FA66A" },
];

export function VocabularyPageClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VocabularyStatus | "ALL">(
    "ALL",
  );
  const [activeTab, setActiveTab] = useState<ViewTab>("words");
  const [creating, setCreating] = useState(false);
  const [sets] = useState<VocabularySet[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);

  const listQuery = useQuery(vocabularyQueries.list());
  const statsQuery = useQuery(vocabularyQueries.stats());

  const items = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const stats = statsQuery.data;
  const total = stats?.total ?? items.length;

  const filteredItems = useMemo(
    () =>
      statusFilter === "ALL"
        ? items
        : items.filter((item) => item.learningstatus === statusFilter),
    [items, statusFilter],
  );

  const createItem = useCreateVocabularyMutation();
  const updateItem = useUpdateVocabularyMutation();
  const deleteItem = useDeleteVocabularyMutation();

  const dialogMode: "create" | "edit" = editingItem ? "edit" : "create";
  const dialogPending =
    dialogMode === "edit" ? updateItem.isPending : createItem.isPending;

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleDialogSubmit = (values: {
    term: string;
    translation: string;
    partofSpeech: VocabularyItem["partofSpeech"];
    learningstatus: VocabularyStatus;
  }) => {
    if (editingItem) {
      updateItem.mutate(
        { id: editingItem.id, ...values },
        { onSuccess: closeDialog },
      );
    } else {
      createItem.mutate(
        {
          term: values.term,
          translation: values.translation,
          partofSpeech: values.partofSpeech,
          sourceLanguage: "en",
          targetLanguage: "vi",
        },
        { onSuccess: closeDialog },
      );
    }
  };

  const handleAddClick = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: VocabularyItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id);
  };

  const handleCreateSet = async (_name: string) => {
    setCreating(true);
    // TODO: implement create set
    setCreating(false);
  };
  const handleDeleteSet = async (id: string) => {
    // TODO: implement delete set — keeping local-only for now
    void id;
  };

  const wOn = activeTab === "words";
  const sOn = activeTab === "sets";

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F2EC]">
      <div className="mx-auto max-w-[1020px] px-10 py-10 pb-16">
        <div className="mb-7">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#221F2B] mb-1">
            Từ vựng
          </h1>
          <p className="text-sm text-[#565160] leading-relaxed">
            Xem lại và quản lý các từ và cụm từ đã lưu.
          </p>
        </div>

        <div
          className="grid gap-3 mb-8"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        >
          {STAT_CONFIG.map(({ key, label, sublabel, accent }) => (
            <StatCard
              key={key}
              label={label}
              value={stats?.[key] ?? 0}
              sublabel={sublabel}
              accent={accent}
            />
          ))}
        </div>

        <div className="flex bg-white border border-[#EAE5DB] rounded-xl p-0.5 max-w-xs mb-6">
          <button
            type="button"
            className={`${TAB_BASE} ${wOn ? TAB_ON : ""}`}
            onClick={() => setActiveTab("words")}
          >
            <BookOpen className="size-3.5" strokeWidth={2} />
            Từ vựng
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: wOn ? "rgba(255,255,255,0.25)" : "#F0EDE8",
                color: wOn ? "#fff" : "#908B98",
              }}
            >
              {total}
            </span>
          </button>
          <button
            type="button"
            className={`${TAB_BASE} ${sOn ? TAB_ON : ""}`}
            onClick={() => setActiveTab("sets")}
          >
            <Library className="size-3.5" strokeWidth={2} />
            Bộ từ
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

        {activeTab === "words" && (
          <VocabularyList
            items={filteredItems}
            total={total}
            page={page}
            pageSize={20}
            search={search}
            statusFilter={statusFilter}
            loading={listQuery.isPending}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            onStatusFilterChange={(s) => {
              setStatusFilter(s);
              setPage(1);
            }}
            onPageChange={setPage}
            onAddClick={handleAddClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

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

      <VocabularyFormDialog
        key={editingItem?.id ?? "new"}
        open={dialogOpen}
        mode={dialogMode}
        item={editingItem}
        pending={dialogPending}
        onSubmit={handleDialogSubmit}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditingItem(null);
        }}
      />
    </div>
  );
}