"use client";

import { Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/shared/utils";
import type { DictionaryEntryDto, DictionarySenseDto } from "@/lib/dictionary/shared/dictionary-dtos";
import { useTranslations } from "next-intl";
import type { SaveStatus } from "../hooks/use-save-dictionary-vocabulary";

interface DictionaryEntryCardProps {
  entry: DictionaryEntryDto;
  saveSense: (entry: DictionaryEntryDto, sense: DictionarySenseDto) => void;
  getSaveStatus: (entryId: string, senseId: string) => SaveStatus;
}

export function DictionaryEntryCard({
  entry,
  saveSense,
  getSaveStatus,
}: DictionaryEntryCardProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl">{entry.headword}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {entry.senses.map((sense) => (
          <SenseBlock
            key={sense.id}
            sense={sense}
            status={getSaveStatus(entry.id, sense.id)}
            onSave={() => saveSense(entry, sense)}
          />
        ))}

        {entry.senses.length > 0 && entry.senses[0].translations[0] && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              {t("Dictionary.source")}: {entry.senses[0].translations[0].sourceLabel}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface SenseBlockProps {
  sense: DictionarySenseDto;
  status: SaveStatus;
  onSave: () => void;
}

function SenseBlock({ sense, status, onSave }: SenseBlockProps) {
  const t = useTranslations();
  const primary = sense.translations.find((t) => t.isPrimary) ?? sense.translations[0];
  const isDisabled = status === "saved" || status === "saving";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {sense.partOfSpeech && (
          <Badge variant="secondary" className="text-xs">{sense.partOfSpeech}</Badge>
        )}
        {sense.definition && (
          <span className="text-sm text-muted-foreground">{sense.definition}</span>
        )}
      </div>

      {primary && (
        <p className="text-lg font-medium text-primary">{primary.translation}</p>
      )}

      {sense.translations.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {sense.translations
            .filter((t) => !t.isPrimary)
            .map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs">
                {t.translation}
              </Badge>
            ))}
        </div>
      )}

      {sense.example && (
        <p className="text-sm italic text-muted-foreground">&ldquo;{sense.example}&rdquo;</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={status === "saved" ? "ghost" : "outline"}
          size="xs"
          className={cn(
            "text-xs gap-1.5",
            status === "saved" && "text-muted-foreground",
            status === "error" && "text-destructive",
          )}
          onClick={status === "error" ? onSave : onSave}
          disabled={isDisabled}
          aria-label={
            status === "saved"
              ? t("Dictionary.savedToVocabulary")
              : t("Dictionary.saveToVocabulary")
          }
        >
          <Bookmark
            className={cn(
              "w-3 h-3",
              status === "saved" && "fill-current",
            )}
          />
          {status === "idle" && t("Dictionary.saveToVocabulary")}
          {status === "saving" && t("Dictionary.saving")}
          {status === "saved" && t("Dictionary.savedToVocabulary")}
          {status === "error" && t("Dictionary.saveFailed")}
        </Button>

        {sense.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sense.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
