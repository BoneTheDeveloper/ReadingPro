"use client";

import { useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/component/ui/dialog";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Label } from "@/component/ui/label";
import { Textarea } from "@/component/ui/textarea";
import { PartOfSpeech, VocabularyStatus } from "@/generated/prisma/enums";
import {
  VocabularyUpdateInputSchema,
  type VocabularyItem,
  type VocabularyUpdateInput,
} from "@/features/vocabulary/schema";

const POS_OPTIONS: Array<{ value: PartOfSpeech; label: string }> = [
  { value: "NOUN", label: "Danh từ" },
  { value: "VERB", label: "Động từ" },
  { value: "ADJECTIVE", label: "Tính từ" },
  { value: "ADVERB", label: "Trạng từ" },
  { value: "PREPOSITION", label: "Giới từ" },
  { value: "CONJUNCTION", label: "Liên từ" },
  { value: "PHRASE", label: "Cụm từ" },
  { value: "OTHER", label: "Khác" },
];

const STATUS_OPTIONS: Array<{ value: VocabularyStatus; label: string }> = [
  { value: "NEW", label: "Mới" },
  { value: "LEARNING", label: "Đang học" },
  { value: "MEMORIZED", label: "Đã thuộc" },
];

const FIELD_BASE =
  "h-10 rounded-xl border-[#EAE5DB] bg-white text-sm text-[#221F2B] focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/15";

const SELECT_BASE =
  "h-10 rounded-xl border border-[#EAE5DB] bg-white px-3 text-sm text-[#221F2B] focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/15 focus:outline-none";

interface VocabularyFormValues {
  term: string;
  translation: string;
  partofSpeech: PartOfSpeech;
  learningstatus: VocabularyStatus;
}

const EMPTY_VALUES: VocabularyFormValues = {
  term: "",
  translation: "",
  partofSpeech: "OTHER",
  learningstatus: "NEW",
};

export interface VocabularyFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  /** When `mode === "edit"` the row being edited; ignored in create mode. */
  item?: VocabularyItem | null;
  /** Pending flag — wired from the caller's mutation hook. */
  pending?: boolean;
  /** Submit handler. Receives validated form values; the caller maps to a mutation. */
  onSubmit: (values: VocabularyFormValues) => void;
  onOpenChange: (open: boolean) => void;
}

export function VocabularyFormDialog({
  open,
  mode,
  item,
  pending = false,
  onSubmit,
  onOpenChange,
}: VocabularyFormDialogProps) {
  const termId = useId();
  const posId = useId();
  const translationId = useId();
  const statusId = useId();

  const initialValues: VocabularyFormValues =
    mode === "edit" && item
      ? {
          term: item.term,
          translation: item.translation,
          partofSpeech: item.partofSpeech,
          learningstatus: item.learningstatus,
        }
      : EMPTY_VALUES;

  const [values, setValues] = useState<VocabularyFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof VocabularyFormValues, string>>>({});

  const termRef = useRef<HTMLInputElement | null>(null);

  // The parent passes a `key` that changes whenever the dialog opens with a
  // different target item, so this instance is remounted with fresh state.
  // No useEffect-based reset is needed here.

  const title = mode === "edit" ? "Sửa từ vựng" : "Thêm từ vựng";
  const submitLabel = mode === "edit" ? "Lưu thay đổi" : "Thêm";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = VocabularyUpdateInputSchema.safeParse({
      term: values.term,
      translation: values.translation,
      partofSpeech: values.partofSpeech,
      learningstatus: values.learningstatus,
    });

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof VocabularyFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof VocabularyFormValues | undefined;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      // Auto-focus the first invalid field for keyboard users (focus-management rule).
      const firstInvalid = Object.keys(fieldErrors)[0];
      if (firstInvalid === "term") termRef.current?.focus();
      return;
    }

    setErrors({});
    onSubmit(parsed.data as VocabularyUpdateInput & { learningstatus: VocabularyStatus });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md rounded-2xl p-6 gap-5"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#221F2B]">
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={termId}
              className="text-xs font-semibold text-[#565160]"
            >
              Từ vựng
            </Label>
            <Input
              ref={termRef}
              id={termId}
              value={values.term}
              onChange={(e) =>
                setValues((v) => ({ ...v, term: e.target.value }))
              }
              placeholder="Nhập từ cần học"
              maxLength={80}
              disabled={pending}
              aria-invalid={errors.term ? true : undefined}
              aria-describedby={errors.term ? `${termId}-err` : undefined}
              className={FIELD_BASE}
              autoComplete="off"
              autoFocus
            />
            {errors.term && (
              <p
                id={`${termId}-err`}
                className="text-xs text-[#C8442B]"
                role="alert"
              >
                {errors.term}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={posId}
              className="text-xs font-semibold text-[#565160]"
            >
              Loại từ
            </Label>
            <select
              id={posId}
              value={values.partofSpeech}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  partofSpeech: e.target.value as PartOfSpeech,
                }))
              }
              disabled={pending}
              className={SELECT_BASE}
            >
              {POS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={translationId}
              className="text-xs font-semibold text-[#565160]"
            >
              Nghĩa
            </Label>
            <Textarea
              id={translationId}
              value={values.translation}
              onChange={(e) =>
                setValues((v) => ({ ...v, translation: e.target.value }))
              }
              placeholder="Nghĩa tiếng Việt..."
              maxLength={200}
              disabled={pending}
              aria-invalid={errors.translation ? true : undefined}
              aria-describedby={
                errors.translation ? `${translationId}-err` : undefined
              }
              className="rounded-xl border-[#EAE5DB] bg-white text-sm text-[#221F2B] focus:border-[#5A4FE0] focus:ring-2 focus:ring-[#5A4FE0]/15 min-h-20"
            />
            {errors.translation && (
              <p
                id={`${translationId}-err`}
                className="text-xs text-[#C8442B]"
                role="alert"
              >
                {errors.translation}
              </p>
            )}
          </div>

          {mode === "edit" && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={statusId}
                className="text-xs font-semibold text-[#565160]"
              >
                Trạng thái
              </Label>
              <select
                id={statusId}
                value={values.learningstatus}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    learningstatus: e.target.value as VocabularyStatus,
                  }))
                }
                disabled={pending}
                className={SELECT_BASE}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="h-9 px-4 rounded-xl border-[#EAE5DB] text-sm font-semibold text-[#565160] hover:border-[#5A4FE0] hover:text-[#4A3FD0]"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              className="h-9 px-4 rounded-xl text-sm font-semibold gap-1.5"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
