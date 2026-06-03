"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DictionaryEntryDto, DictionarySenseDto } from "@/lib/dictionary/shared/dictionary-dtos";
import { useTranslations } from "next-intl";

interface DictionaryEntryCardProps {
  entry: DictionaryEntryDto;
}

export function DictionaryEntryCard({ entry }: DictionaryEntryCardProps) {
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
          <SenseBlock key={sense.id} sense={sense} />
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

function SenseBlock({ sense }: { sense: DictionarySenseDto }) {
  const primary = sense.translations.find((t) => t.isPrimary) ?? sense.translations[0];

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

      {sense.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sense.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
