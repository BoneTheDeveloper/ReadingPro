"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";
import { MultiChoice, OptionField, SingleChoice } from "@/client/components/option-chips";
import { optionsFrom } from "@/client/lib/options-from";
import { StudioArtifactType } from "@/shared/enums";
import {
  DIFFICULTY_LABEL,
  EXPLANATION_LANGUAGE_LABEL,
  FLASHCARD_BACK_LABEL,
  FLASHCARD_CONTENT_LABEL,
  FLASHCARD_COUNTS,
  QUESTION_COUNTS,
  QUESTION_FOCUS_LABEL,
  QUESTION_FORMAT_LABEL,
  flashcardGenerationOptionsSchema,
  questionGenerationOptionsSchema,
  type FlashcardGenerationOptions,
  type QuestionGenerationOptions,
} from "@/shared/studio/generation-options";

type GenerateType = typeof StudioArtifactType.QUESTION | typeof StudioArtifactType.FLASHCARD;

interface GenerateOptionsDialogProps {
  /** Which artifact the dialog configures; null keeps it closed. */
  type: GenerateType | null;
  onClose: () => void;
  onGenerate: (type: GenerateType, options: QuestionGenerationOptions | FlashcardGenerationOptions) => void;
}

const countOptions = (counts: readonly number[], unit: string) => counts.map((n) => ({ value: n, label: `${n} ${unit}` }));

// Remembered for the session so the next set starts from the last choice.
let lastQuestionOptions = questionGenerationOptionsSchema.parse({});
let lastFlashcardOptions = flashcardGenerationOptionsSchema.parse({});

export function GenerateOptionsDialog({ type, onClose, onGenerate }: GenerateOptionsDialogProps) {
  return (
    <Dialog open={type !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {type === StudioArtifactType.QUESTION && (
          <QuestionForm
            onCancel={onClose}
            onSubmit={(options) => {
              lastQuestionOptions = options;
              onGenerate(type, options);
            }}
          />
        )}
        {type === StudioArtifactType.FLASHCARD && (
          <FlashcardForm
            onCancel={onClose}
            onSubmit={(options) => {
              lastFlashcardOptions = options;
              onGenerate(type, options);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Footer({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Huỷ
      </Button>
      <Button type="submit" className="gap-1.5">
        <Sparkles className="size-4" aria-hidden />
        {label}
      </Button>
    </div>
  );
}

function QuestionForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (o: QuestionGenerationOptions) => void }) {
  const [o, setO] = useState(lastQuestionOptions);
  const set = <K extends keyof QuestionGenerationOptions>(key: K) => (value: QuestionGenerationOptions[K]) =>
    setO((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(o);
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Tạo câu hỏi</DialogTitle>
      </DialogHeader>
      <OptionField label="Số câu">
        <SingleChoice options={countOptions(QUESTION_COUNTS, "câu")} value={o.count} onChange={set("count")} />
      </OptionField>
      <OptionField label="Độ khó">
        <SingleChoice options={optionsFrom(DIFFICULTY_LABEL)} value={o.difficulty} onChange={set("difficulty")} />
      </OptionField>
      <OptionField label="Dạng câu hỏi" hint="chọn một hoặc nhiều">
        <MultiChoice options={optionsFrom(QUESTION_FORMAT_LABEL)} value={o.formats} onChange={set("formats")} min={1} />
      </OptionField>
      <OptionField label="Kỹ năng trọng tâm" hint="bỏ trống để cân bằng">
        <MultiChoice options={optionsFrom(QUESTION_FOCUS_LABEL)} value={o.focus} onChange={set("focus")} />
      </OptionField>
      <OptionField label="Ngôn ngữ giải thích">
        <SingleChoice
          options={optionsFrom(EXPLANATION_LANGUAGE_LABEL)}
          value={o.explanationLanguage}
          onChange={set("explanationLanguage")}
        />
      </OptionField>
      <Footer onCancel={onCancel} label={`Tạo ${o.count} câu hỏi`} />
    </form>
  );
}

function FlashcardForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (o: FlashcardGenerationOptions) => void }) {
  const [o, setO] = useState(lastFlashcardOptions);
  const set = <K extends keyof FlashcardGenerationOptions>(key: K) => (value: FlashcardGenerationOptions[K]) =>
    setO((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(o);
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Tạo flashcard</DialogTitle>
      </DialogHeader>
      <OptionField label="Số thẻ">
        <SingleChoice options={countOptions(FLASHCARD_COUNTS, "thẻ")} value={o.count} onChange={set("count")} />
      </OptionField>
      <OptionField label="Nội dung thẻ">
        <SingleChoice options={optionsFrom(FLASHCARD_CONTENT_LABEL)} value={o.contentType} onChange={set("contentType")} />
      </OptionField>
      <OptionField label="Độ khó">
        <SingleChoice options={optionsFrom(DIFFICULTY_LABEL)} value={o.difficulty} onChange={set("difficulty")} />
      </OptionField>
      <OptionField label="Mặt sau">
        <SingleChoice options={optionsFrom(FLASHCARD_BACK_LABEL)} value={o.back} onChange={set("back")} />
      </OptionField>
      <OptionField label="Câu ví dụ">
        <SingleChoice
          options={[
            { value: "yes", label: "Có" },
            { value: "no", label: "Không" },
          ]}
          value={o.withExample ? "yes" : "no"}
          onChange={(v) => set("withExample")(v === "yes")}
        />
      </OptionField>
      <Footer onCancel={onCancel} label={`Tạo ${o.count} thẻ`} />
    </form>
  );
}
