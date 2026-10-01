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
  useUpdateVocabularySetMutation,
} from "../api/set-mutations";
import type { VocabularyItem } from "@/shared/vocabulary/schema";
import { SET_DAILY_NEW_LIMIT_MAX } from "@/shared/vocabulary/set-schema";
import { formatDate } from "../lib/format-date";
import { STATUS_LABEL, STATUS_STYLE } from "../lib/status-display";

const COLUMN_HEAD = "text-[10px] font-bold uppercase tracking-widest text-[#908B98]";

const FIELD =
  "h-9 text-xs border-[#EAE5DB] rounded-xl focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/10";

interface VocabularySetDialogProps {
  setId: string;
  onClose: () => void;
}

/** Rename a set, move saved words into or out of it, or delete it. */
export function VocabularySetDialog({ setId, onClose }: VocabularySetDialogProps) {
  const detail = useQuery(vocabularySetQueries.detail(setId));
  const bank = useQuery(vocabularyQueries.list());

  // Null until the user types, so the fields follow the server values after a save.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const update = useUpdateVocabularySetMutation();
  const remove = useDeleteVocabularySetMutation();
  const addItems = useAddVocabularySetItemsMutation();
  const removeItem = useRemoveVocabularySetItemMutation();

  const set = detail.data;
  const name = nameDraft ?? set?.name ?? "";
  const dailyNewLimit = limitDraft ?? set?.dailyNewLimit ?? 0;

  const candidates = useMemo(() => {
    const memberIds = new Set(set?.items.map((item) => item.id));
    const needle = search.trim().toLowerCase();
    return (bank.data ?? []).filter(
      (item) =>
        !memberIds.has(item.id) &&
        (!needle || item.term.includes(needle) || item.translation.includes(needle)),
    );
  }, [bank.data, set, search]);

  const canSave =
    !!set &&
    name.trim().length > 0 &&
    (name.trim() !== set.name || dailyNewLimit !== set.dailyNewLimit);

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
                if (!canSave) return;
                update.mutate(
                  { id: setId, name: name.trim(), dailyNewLimit },
                  {
                    onSuccess: () => {
                      setNameDraft(null);
                      setLimitDraft(null);
                    },
                  },
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
              <label className="flex items-center gap-1.5 text-xs text-[#565160] shrink-0">
                Từ mới/ngày
                <Input
                  type="number"
                  min={0}
                  max={SET_DAILY_NEW_LIMIT_MAX}
                  value={dailyNewLimit}
                  onChange={(e) =>
                    setLimitDraft(
                      Math.min(SET_DAILY_NEW_LIMIT_MAX, Math.max(0, Math.trunc(Number(e.target.value)) || 0)),
                    )
                  }
                  className={`${FIELD} w-16`}
                />
              </label>
              <Button
                type="submit"
                size="sm"
                disabled={!canSave || update.isPending}
                className="h-9 rounded-xl"
              >
                Lưu
              </Button>
              {!set.isDefault && (
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
              )}
            </form>

            <div className="text-xs text-[#908B98]">
              Tạo ngày {formatDate(set.createdAt)} · Học gần nhất:{" "}
              {set.lastStudiedAt ? formatDate(set.lastStudiedAt) : "chưa học"} ·{" "}
              {set.studiedToday ? "Hôm nay đã học" : "Hôm nay chưa học"}
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <div className={COLUMN_HEAD}>Trong bộ ({set.items.length})</div>
              <div className="border border-[#EAE5DB] rounded-xl overflow-hidden">
                <div className="flex items-center px-3 py-2 bg-[#FBF9F5] border-b border-[#EAE5DB]">
                  <div className={`w-28 shrink-0 ${COLUMN_HEAD}`}>Từ</div>
                  <div className={`flex-1 min-w-0 ${COLUMN_HEAD}`}>Nghĩa</div>
                  <div className={`w-24 shrink-0 text-center ${COLUMN_HEAD}`}>Trạng thái</div>
                  <div className={`w-20 shrink-0 text-center ${COLUMN_HEAD}`}>Ôn gần nhất</div>
                  <div className={`w-20 shrink-0 text-center ${COLUMN_HEAD}`}>Ôn tiếp</div>
                  <div className="w-8 shrink-0" />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {set.items.length === 0 && (
                    <div className="px-3 py-4 text-xs text-[#908B98] text-center">
                      Bộ từ chưa có từ nào.
                    </div>
                  )}
                  {set.items.map((item) => (
                    <MemberRow
                      key={item.id}
                      item={item}
                      disabled={removeItem.isPending}
                      // A word always has a set, so the default set has nowhere to send it.
                      onRemove={
                        set.isDefault
                          ? undefined
                          : () => removeItem.mutate({ id: setId, itemId: item.id })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <WordColumn
              title="Chuyển từ bộ khác sang"
              emptyText="Không còn từ nào để chuyển."
              items={candidates}
              actionLabel="Chuyển vào bộ"
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  item,
  disabled,
  onRemove,
}: {
  item: VocabularyItem;
  disabled: boolean;
  /** Absent when the word cannot leave this set. */
  onRemove?: () => void;
}) {
  const style = STATUS_STYLE[item.status];
  return (
    <div className="flex items-center px-3 py-2 border-b border-[#EAE5DB] last:border-b-0">
      <div className="w-28 shrink-0 text-sm font-semibold text-[#221F2B] truncate">
        {item.term}
      </div>
      <div className="flex-1 min-w-0 pr-3 text-xs text-[#565160] truncate" title={item.translation}>
        {item.translation}
      </div>
      <div className="w-24 shrink-0 text-center">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: style.bg, color: style.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <div className="w-20 shrink-0 text-center text-xs text-[#908B98]">
        {formatDate(item.lastReviewAt)}
      </div>
      {/* A word never reviewed has no schedule yet; its dueAt is only its save time. */}
      <div className="w-20 shrink-0 text-center text-xs text-[#908B98]">
        {item.status === "NEW" ? "—" : formatDate(item.dueAt)}
      </div>
      {onRemove ? (
        <button
          type="button"
          title="Trả về bộ mặc định"
          aria-label={`Trả về bộ mặc định: ${item.term}`}
          disabled={disabled}
          onClick={onRemove}
          className="flex items-center justify-center size-8 shrink-0 rounded-lg border border-[#EAE5DB] text-[#565160] cursor-pointer hover:border-[#C8442B] hover:text-[#C8442B] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <div className="size-8 shrink-0" />
      )}
    </div>
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
      <div className={COLUMN_HEAD}>{title}</div>
      {header}
      <ul className="border border-[#EAE5DB] rounded-xl divide-y divide-[#EAE5DB] max-h-40 overflow-y-auto">
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
