"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { vocabularyQueries, vocabularySetQueries } from "../api/queries";
import {
  useAddVocabularySetItemsMutation,
  useDeleteVocabularySetMutation,
  useRemoveVocabularySetItemMutation,
  useRenameVocabularySetMutation,
} from "../api/set-mutations";
import type { VocabularyItem } from "@/shared/vocabulary/schema";

const FIELD =
  "h-9 text-xs border-[#EAE5DB] rounded-xl focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/10";

interface VocabularySetDialogProps {
  setId: string;
  onClose: () => void;
}

/** Rename a set, choose which saved words belong to it, or delete it. */
export function VocabularySetDialog({ setId, onClose }: VocabularySetDialogProps) {
  const detail = useQuery(vocabularySetQueries.detail(setId));
  const bank = useQuery(vocabularyQueries.list());

  // Null until the user types, so the field follows the server name after a rename.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const rename = useRenameVocabularySetMutation();
  const remove = useDeleteVocabularySetMutation();
  const addItems = useAddVocabularySetItemsMutation();
  const removeItem = useRemoveVocabularySetItemMutation();

  const set = detail.data;
  const name = nameDraft ?? set?.name ?? "";

  const candidates = useMemo(() => {
    const memberIds = new Set(set?.items.map((item) => item.id));
    const needle = search.trim().toLowerCase();
    return (bank.data ?? []).filter(
      (item) =>
        !memberIds.has(item.id) &&
        (!needle || item.term.includes(needle) || item.translation.includes(needle)),
    );
  }, [bank.data, set, search]);

  const canRename = !!set && name.trim().length > 0 && name.trim() !== set.name;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#221F2B]">Bộ từ</DialogTitle>
        </DialogHeader>

        {!set ? (
          <div className="flex items-center justify-center py-10 text-sm text-[#908B98]">
            <Loader2 className="size-4 animate-spin mr-2" />
            Đang tải...
          </div>
        ) : (
          <>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canRename) return;
                rename.mutate(
                  { id: setId, name: name.trim() },
                  { onSuccess: () => setNameDraft(null) },
                );
              }}
            >
              <Input
                aria-label="Tên bộ từ"
                value={name}
                maxLength={60}
                onChange={(e) => setNameDraft(e.target.value)}
                className={`${FIELD} flex-1`}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!canRename || rename.isPending}
                className="h-9 rounded-xl"
              >
                Đổi tên
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={remove.isPending}
                onClick={() => remove.mutate(setId, { onSuccess: onClose })}
                className="h-9 rounded-xl gap-1.5 border-[#EAE5DB] text-[#C8442B] hover:border-[#C8442B] hover:text-[#C8442B]"
              >
                <Trash2 className="size-3.5" />
                Xóa bộ
              </Button>
            </form>

            <div className="grid gap-4 sm:grid-cols-2">
              <WordColumn
                title={`Trong bộ (${set.items.length})`}
                emptyText="Bộ từ chưa có từ nào."
                items={set.items}
                actionLabel="Bỏ khỏi bộ"
                icon={<X className="size-3.5" />}
                disabled={removeItem.isPending}
                onAction={(item) => removeItem.mutate({ id: setId, itemId: item.id })}
              />
              <WordColumn
                title="Kho từ"
                emptyText="Không còn từ nào để thêm."
                items={candidates}
                actionLabel="Thêm vào bộ"
                icon={<Plus className="size-3.5" />}
                disabled={addItems.isPending}
                onAction={(item) => addItems.mutate({ id: setId, itemIds: [item.id] })}
                header={
                  <Input
                    placeholder="Tìm từ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={FIELD}
                  />
                }
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WordColumn({
  title,
  emptyText,
  items,
  actionLabel,
  icon,
  disabled,
  onAction,
  header,
}: {
  title: string;
  emptyText: string;
  items: VocabularyItem[];
  actionLabel: string;
  icon: React.ReactNode;
  disabled: boolean;
  onAction: (item: VocabularyItem) => void;
  header?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#908B98]">
        {title}
      </div>
      {header}
      <ul className="border border-[#EAE5DB] rounded-xl divide-y divide-[#EAE5DB] max-h-64 overflow-y-auto">
        {items.length === 0 && (
          <li className="px-3 py-4 text-xs text-[#908B98] text-center">{emptyText}</li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#221F2B] truncate">{item.term}</div>
              <div className="text-xs text-[#565160] truncate">{item.translation}</div>
            </div>
            <button
              type="button"
              title={actionLabel}
              aria-label={`${actionLabel}: ${item.term}`}
              disabled={disabled}
              onClick={() => onAction(item)}
              className="flex items-center justify-center size-8 shrink-0 rounded-lg border border-[#EAE5DB] text-[#565160] cursor-pointer hover:border-[#5A4FE0] hover:text-[#4A3FD0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {icon}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
