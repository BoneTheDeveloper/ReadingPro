"use client";

import { Loader2 } from "lucide-react";
import type { DictionarySuggestItemDto } from "@/lib/dictionary/dictionary-dtos";

interface DictionarySuggestDropdownProps {
  suggestions: DictionarySuggestItemDto[];
  loading: boolean;
  visible: boolean;
  onSelect: (item: DictionarySuggestItemDto) => void;
}

export function DictionarySuggestDropdown({
  suggestions,
  loading,
  visible,
  onSelect,
}: DictionarySuggestDropdownProps) {
  if (!visible) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
      {loading && (
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Searching...
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="px-3 py-2.5 text-sm text-muted-foreground">
          No matches found
        </div>
      )}

      {!loading &&
        suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/60 transition-colors text-sm"
            onClick={() => onSelect(item)}
          >
            <span className="font-medium text-foreground">
              {item.headword}
            </span>
            {item.matchType === "alias" && item.matchedAlias && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {item.matchedAlias}
              </span>
            )}
            <span className="text-muted-foreground ml-auto">
              {item.primaryTranslation}
            </span>
          </button>
        ))}
    </div>
  );
}
