"use client";

import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { useCreateVocabularyMutation } from "@/client/features/vocabulary";
import { PartOfSpeech } from "@/shared/enums";
import { PART_OF_SPEECH_LABEL, PART_OF_SPEECH_OPTIONS } from "../lib/part-of-speech";
import type { MeaningChoice } from "./meaning-choice";

/** Matches the vocabulary translation limit (TranslationSchema). */
const TRANSLATION_MAX = 200;

interface SaveMeaningFormProps {
  /** The picked meaning; the parent keys this form by it so a new pick starts fresh. */
  choice: MeaningChoice | null;
  /** The word saved when the user types a meaning without picking one. */
  defaultTerm: string;
  defaultPartOfSpeech?: PartOfSpeech;
  contextSentence: string | null;
  passageId: string;
}

/** The docked save bar: tapping a meaning above fills it; the user can still edit before saving. */
export function SaveMeaningForm({
  choice,
  defaultTerm,
  defaultPartOfSpeech = PartOfSpeech.OTHER,
  contextSentence,
  passageId,
}: SaveMeaningFormProps) {
  const [text, setText] = useState(choice?.text.slice(0, TRANSLATION_MAX) ?? "");
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>(choice?.partOfSpeech ?? defaultPartOfSpeech);
  const createVocabulary = useCreateVocabularyMutation();
  const term = choice?.term ?? defaultTerm;
  const saved = createVocabulary.isSuccess;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    createVocabulary.mutate({
      term,
      translation: text,
      sourceLanguage: "en",
      targetLanguage: "vi",
      partofSpeech: partOfSpeech,
      ...(contextSentence ? { contextSentence } : {}),
      passageId,
    });
  };

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    if (saved) createVocabulary.reset();
  };

  return (
    <form onSubmit={save} className="space-y-2">
      <p className="truncate text-[12px] font-bold uppercase tracking-[0.11em] text-ink-3">
        Lưu “<span className="font-serif text-[16px] font-semibold normal-case tracking-normal text-foreground">{term}</span>” vào từ vựng
      </p>
      <Input
        value={text}
        onChange={(event) => edit(setText)(event.target.value)}
        maxLength={TRANSLATION_MAX}
        placeholder="Chạm một nghĩa ở trên hoặc tự nhập"
        aria-label="Nghĩa sẽ lưu"
      />
      <div className="flex items-center gap-2">
        <select
          value={partOfSpeech}
          onChange={(event) => edit(setPartOfSpeech)(event.target.value as PartOfSpeech)}
          aria-label="Loại từ"
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-[14px]"
        >
          {PART_OF_SPEECH_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {PART_OF_SPEECH_LABEL[value]}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={!text.trim() || createVocabulary.isPending || saved} className="shrink-0 gap-1.5">
          {saved ? <Check className="size-3.5" /> : <Bookmark className="size-3.5" />}
          {createVocabulary.isPending ? "Đang lưu..." : saved ? "Đã lưu" : "Lưu vào từ vựng"}
        </Button>
      </div>
    </form>
  );
}
