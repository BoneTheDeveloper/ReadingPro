"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Search } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { WordLookupPanel, wordLookupQueries } from "@/client/features/dictionary";
import { getErrorMessage } from "@/client/lib/api/error-message";
import { isApiError } from "@/client/lib/api/fetch-json";
import { StudioDetailView } from "../studio-detail-view";
import type { WordLookupRequest } from "../../panel/studio-icon-list";

interface LookupDetailViewProps {
  passageId: string;
  lookupId?: string;
  request?: WordLookupRequest;
  onClose: () => void;
}

/**
 * The "Tra từ" view. A `request` (a word selected in the passage) is looked up
 * and recorded; a `lookupId` reopens a stored row; with neither it is a search
 * box. A search typed here replaces whatever the view was opened with.
 */
export function LookupDetailView({ passageId, lookupId, request, onClose }: LookupDetailViewProps) {
  const [searched, setSearched] = useState<WordLookupRequest | null>(null);
  const active = searched ?? request ?? null;

  return (
    <StudioDetailView title="Tra từ" onClose={onClose}>
      <SearchBox onSearch={(word) => setSearched({ word })} />
      {active ? (
        <RequestedLookup key={`${active.word}|${active.context ?? ""}`} passageId={passageId} request={active} />
      ) : lookupId ? (
        <StoredLookup passageId={passageId} lookupId={lookupId} />
      ) : (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          Nhập một từ, hoặc bôi đen một từ trong bài đọc rồi bấm Dịch.
        </p>
      )}
    </StudioDetailView>
  );
}

function SearchBox({ onSearch }: { onSearch: (word: string) => void }) {
  const [value, setValue] = useState("");
  const word = value.trim();

  return (
    <form
      className="flex gap-2 border-b border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        // Same rule as the selection: one token.
        if (word && !/\s/.test(word)) onSearch(word);
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={40}
        placeholder="Tra một từ tiếng Anh"
        aria-label="Từ cần tra"
      />
      <Button type="submit" size="sm" disabled={!word || /\s/.test(word)} className="gap-1.5">
        <Search className="size-3.5" />
        Tra
      </Button>
    </form>
  );
}

function RequestedLookup({ passageId, request }: { passageId: string; request: WordLookupRequest }) {
  const context = request.context ?? null;
  const lookup = useQuery(wordLookupQueries.lookUp(passageId, request.word, context));

  if (lookup.isPending) return <Loading />;
  // Not in the dictionary: no row was recorded, but the outside translators still help.
  if (lookup.isError && !(isApiError(lookup.error) && lookup.error.reason === "dictionary.not_found")) {
    return <Failure error={lookup.error} />;
  }
  return (
    <WordLookupPanel
      passageId={passageId}
      selectedText={request.word}
      context={context}
      entries={lookup.data?.entries ?? []}
    />
  );
}

function StoredLookup({ passageId, lookupId }: { passageId: string; lookupId: string }) {
  const detail = useQuery(wordLookupQueries.detail(lookupId));

  if (detail.isPending) return <Loading />;
  if (detail.isError) return <Failure error={detail.error} />;
  return (
    <WordLookupPanel
      passageId={passageId}
      selectedText={detail.data.lookup.selectedText}
      context={detail.data.lookup.contextSentence}
      entries={detail.data.entries}
    />
  );
}

function Loading() {
  return (
    <p className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      Đang tra từ điển...
    </p>
  );
}

function Failure({ error }: { error: Error }) {
  return <p className="px-4 py-6 text-center text-[13px] text-destructive">{getErrorMessage(error)}</p>;
}
