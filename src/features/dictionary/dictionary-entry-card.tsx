"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DictionaryEntry } from "@/generated/prisma/client";

interface DictionaryEntryCardProps {
  entry: DictionaryEntry;
}

interface Meaning {
  definition?: string;
  partOfSpeech?: string;
}

interface Example {
  sentence?: string;
  translation?: string;
}

export function DictionaryEntryCard({ entry }: DictionaryEntryCardProps) {
  const meanings = (entry.meanings as Meaning[] | null) ?? [];
  const examples = (entry.examples as Example[] | null) ?? [];
  const relatedWords = (entry.relatedWords as string[] | null) ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl">{entry.normalizedTerm}</CardTitle>
          {entry.type && <Badge variant="secondary">{entry.type}</Badge>}
          {entry.confidence < 1 && (
            <Badge variant="outline" className="text-xs">
              {Math.round(entry.confidence * 100)}%
            </Badge>
          )}
        </div>
        {entry.pronunciation && (
          <p className="text-sm text-muted-foreground">{entry.pronunciation}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-lg font-medium text-primary">{entry.translation}</p>
        </div>

        {meanings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Meanings
              </p>
              <ul className="space-y-1">
                {meanings.map((m, i) => (
                  <li key={i} className="text-sm">
                    {m.partOfSpeech && (
                      <span className="font-medium text-muted-foreground mr-2">
                        {m.partOfSpeech}
                      </span>
                    )}
                    {m.definition}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {examples.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Examples
              </p>
              <ul className="space-y-2">
                {examples.map((ex, i) => (
                  <li key={i} className="text-sm space-y-0.5">
                    {ex.sentence && <p className="text-foreground">{ex.sentence}</p>}
                    {ex.translation && (
                      <p className="text-muted-foreground">{ex.translation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {relatedWords.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Related Words
              </p>
              <div className="flex flex-wrap gap-1.5">
                {relatedWords.map((w) => (
                  <Badge key={w} variant="outline" className="text-xs">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">
          Source: {entry.source}
        </p>
      </CardContent>
    </Card>
  );
}
