"use client";

import { type ReactNode } from "react";
import { useState, useMemo } from "react";
import { Search, Plus, PanelLeft } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { SourceListItem } from "./source-list-item";
import type { PassageListItem } from "@/features/passage/schema";

interface DefaultSourceHeaderProps {
  onToggleCollapse: () => void;
}

function DefaultSourceHeader({ onToggleCollapse }: DefaultSourceHeaderProps) {
  return (
    <div className="h-[54px] px-4 flex items-center justify-between border-b border-border">
      <h2 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.13em]">
        Nguồn
      </h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
      >
        <PanelLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface DefaultSourceViewProps {
  items: PassageListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenUploadModal: () => void;
  onToggleCollapse: () => void;
  children?: ReactNode;
}

export function DefaultSourceView({
  items,
  activeId,
  onSelect,
  onDelete,
  onOpenUploadModal,
  onToggleCollapse,
  children,
}: DefaultSourceViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [items, searchQuery]);

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <DefaultSourceHeader onToggleCollapse={onToggleCollapse} />

        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nguồn..."
              className="pl-9 h-9 rounded-[11px] bg-surface border-border text-[13px]"
            />
          </div>
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="w-full mt-1 inline-flex items-center justify-center gap-[7px] px-3 py-[11px] rounded-[13px] border-[1.5px] border-dashed border-border-strong text-xs font-semibold text-ink-3 hover:border-primary hover:text-primary hover:bg-surface transition-all duration-140 cursor-pointer"
          >
            <Plus className="w-[15px] h-[15px]" />
            Thêm nguồn
          </button>
        </div>

        <div className="flex-1 overflow-y-auto panel-scroll px-2.5 pt-1 pb-3">
          <div className="flex flex-col gap-[3px]">
            {children}
            {filteredItems.map((item) => (
              <SourceListItem
                key={item.id}
                item={item}
                active={activeId === item.id}
                onSelect={() => onSelect(item.id)}
                onDelete={() => onDelete(item.id)}
              />
            ))}

            {filteredItems.length === 0 && items.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Không có nguồn phù hợp
              </p>
            )}

            {items.length === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-8">
                Chưa có nguồn nào.
                <br />
                Thêm một nguồn để bắt đầu.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
