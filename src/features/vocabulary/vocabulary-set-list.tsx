"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VocabularySetRow } from "./vocabulary-set-row";
import type { VocabularySet } from "./vocabulary-types";

interface VocabularySetListProps {
  sets: VocabularySet[];
  loading: boolean;
  onCreateSet: (name: string) => void;
  onDeleteSet: (id: string) => void;
  creating: boolean;
}

export function VocabularySetList({
  sets,
  loading,
  onCreateSet,
  onDeleteSet,
  creating,
}: VocabularySetListProps) {
  const t = useTranslations("Vocabulary");
  const [newSetName, setNewSetName] = useState("");
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());

  const manualSets = sets.filter((s) => s.type === "MANUAL");
  const dailySets = sets.filter((s) => s.type === "DAILY");
  const weeklySets = sets.filter((s) => s.type === "WEEKLY");

  const toggleExpanded = useCallback((id: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    const trimmed = newSetName.trim();
    if (!trimmed) return;
    onCreateSet(trimmed);
    setNewSetName("");
  }, [newSetName, onCreateSet]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleCreate();
    },
    [handleCreate],
  );

  if (loading) return <VocabularySetListSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {/* Manual sets section */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("mySets")}
          </h3>
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("newSetName")}
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 w-40 text-xs"
            />
            <Button
              size="icon-xs"
              disabled={!newSetName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            </Button>
          </div>
        </div>

        {manualSets.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {manualSets.map((set) => (
              <VocabularySetRow
                key={set.id}
                set={set}
                expanded={expandedSets.has(set.id)}
                onToggle={() => toggleExpanded(set.id)}
                onDelete={() => onDeleteSet(set.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground py-2">{t("noManualSets")}</p>
        )}
      </section>

      {/* Auto sets section */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("autoSets")}
        </h3>

        {dailySets.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dailySets")}</p>
            <ul className="flex flex-col gap-2">
              {dailySets.map((set) => (
                <VocabularySetRow
                  key={set.id}
                  set={set}
                  expanded={expandedSets.has(set.id)}
                  onToggle={() => toggleExpanded(set.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {weeklySets.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("weeklySets")}</p>
            <ul className="flex flex-col gap-2">
              {weeklySets.map((set) => (
                <VocabularySetRow
                  key={set.id}
                  set={set}
                  expanded={expandedSets.has(set.id)}
                  onToggle={() => toggleExpanded(set.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {dailySets.length === 0 && weeklySets.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">{t("noAutoSets")}</p>
        )}
      </section>
    </div>
  );
}

function VocabularySetListSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
          <div className="size-3.5 rounded bg-muted" />
          <div className="size-7 rounded-md bg-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-2/5 rounded bg-muted" />
            <div className="h-2.5 w-1/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
