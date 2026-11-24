"use client";

import { useState } from "react";
import { useIsPro } from "@/client/features/subscription";
import { PartOfSpeech } from "@/shared/enums";
import type { MatchedDictionaryEntry } from "@/shared/dictionary/schema";
import { AiContextMeaning } from "./ai-context-meaning";
import { DictionaryEntryView } from "./dictionary-entry-view";
import { ExternalTranslatorBar } from "./external-translator-bar";
import { SaveMeaningForm } from "./save-meaning-form";
import type { MeaningChoice } from "./meaning-choice";

interface WordLookupPanelProps {
  passageId: string;
  selectedText: string;
  context: string | null;
  /** The word's own entry and/or its base form; empty when the dictionary has neither. */
  entries: MatchedDictionaryEntry[];
}

/** The body of the "Tra từ" view: dictionary entries, the AI meaning on request (Pro), outside translators, and saving. */
export function WordLookupPanel({ passageId, selectedText, context, entries }: WordLookupPanelProps) {
  const isPro = useIsPro();
  const [choice, setChoice] = useState<MeaningChoice | null>(null);
  const first = entries[0];
  const firstPartOfSpeech = first?.senses.find((s) => s.kind === "word")?.partOfSpeech ?? PartOfSpeech.OTHER;

  return (
    <div className="space-y-5 p-4">
      {context && (
        <blockquote className="border-l-2 border-primary pl-3 font-serif text-[14px] italic leading-snug text-ink-3">
          {context}
        </blockquote>
      )}

      {/* The AI meaning needs the sentence, so a word typed into the search box has none. */}
      {context && (
        <AiContextMeaning
          word={selectedText}
          context={context}
          isPro={isPro}
          selectedKey={choice?.key ?? null}
          onSelectMeaning={setChoice}
        />
      )}

      {entries.length > 0 ? (
        entries.map((entry, i) => (
          <div key={entry.headword} className={i > 0 ? "border-t border-border pt-4" : undefined}>
            <DictionaryEntryView
              entry={entry}
              selectedText={selectedText}
              context={context}
              selectedKey={choice?.key ?? null}
              onSelectMeaning={setChoice}
            />
          </div>
        ))
      ) : (
        <div>
          <p className="font-serif text-[22px] font-semibold text-foreground">{selectedText}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Không có trong từ điển. Hãy thử các trang tra từ bên dưới.
          </p>
        </div>
      )}

      <div className="space-y-4 border-t border-border pt-4">
        <ExternalTranslatorBar word={first?.displayHeadword ?? selectedText} sentence={context} />
        <SaveMeaningForm
          key={choice?.key ?? "none"}
          choice={choice}
          defaultTerm={first?.displayHeadword ?? selectedText.toLowerCase()}
          defaultPartOfSpeech={firstPartOfSpeech}
          contextSentence={context}
          passageId={passageId}
        />
      </div>
    </div>
  );
}
