import { screen, waitFor } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";
import { DictionaryPageClient } from "@/features/dictionary/dictionary-page-client";
import { renderWithUser } from "../../../helpers";

const dictionaryEntry = {
  id: "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
  headword: "algorithm",
  sourceLanguage: "en",
  frequencyRank: 100,
  senses: [{
    id: "sense-1",
    partOfSpeech: "noun",
    definition: "a set of rules",
    example: null,
    tags: [],
    usageRank: 0,
    translations: [{
      id: "trans-1",
      senseId: "sense-1",
      targetLanguage: "vi",
      translation: "thuat toan",
      isPrimary: true,
      rank: 1,
      confidence: null,
      status: "reviewed",
      sourceType: "seed",
      sourceName: null,
      reviewedAt: null,
      sourceLabel: "Dictionary",
    }],
  }],
};

const suggestion = {
  id: dictionaryEntry.id,
  headword: "algorithm",
  matchType: "exact",
  matchedAlias: null,
  primaryTranslation: "thuat toan",
  sourceLabel: "Dictionary",
};

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("DictionaryPageClient response contracts", () => {
  it("rejects malformed suggest success payloads before showing suggestions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ success: true, data: [{ id: "missing-fields" }] }), {
          status: 200,
        }),
      ),
    );
    const { user } = renderWithUser(<DictionaryPageClient />);

    await user.type(screen.getByPlaceholderText("Search for a word..."), "algo");

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "dictionary",
          level: "error",
          message: "dictionary-suggest-schema-error",
          data: { route: "/api/dictionary/suggest" },
        }),
      );
    });
    expect(screen.queryByText("algorithm")).not.toBeInTheDocument();
  });

  it("rejects malformed entry-detail success payloads before rendering an entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/dictionary/suggest")) {
          return new Response(JSON.stringify({ success: true, data: [suggestion] }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ success: true, data: { id: dictionaryEntry.id } }), {
          status: 200,
        });
      }),
    );
    const { user } = renderWithUser(<DictionaryPageClient />);

    await user.type(screen.getByPlaceholderText("Search for a word..."), "algo");
    await user.click(await screen.findByText("algorithm"));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "dictionary",
          level: "error",
          message: "dictionary-entry-detail-schema-error",
          data: { route: "/api/dictionary/entries/:entryId" },
        }),
      );
    });
    expect(screen.getByText("Search failed. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText("thuat toan")).not.toBeInTheDocument();
  });

  it("ignores stale suggest responses after the query changes", async () => {
    const stale = deferredResponse();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("q=algo")) return stale.promise;
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      }),
    );
    const { user } = renderWithUser(<DictionaryPageClient />);

    const input = screen.getByPlaceholderText("Search for a word...");
    await user.type(input, "algo");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await user.clear(input);
    stale.resolve(new Response(JSON.stringify({ success: true, data: [suggestion] }), { status: 200 }));

    await waitFor(() => {
      expect(screen.queryByText("algorithm")).not.toBeInTheDocument();
    });
  });

  it("ignores stale entry-detail responses after a newer selection wins", async () => {
    const firstDetail = deferredResponse();
    const secondSuggestion = {
      ...suggestion,
      id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a",
      headword: "analysis",
      primaryTranslation: "phan tich",
    };
    const secondEntry = {
      ...dictionaryEntry,
      id: secondSuggestion.id,
      headword: "analysis",
      senses: [{
        ...dictionaryEntry.senses[0],
        translations: [{
          ...dictionaryEntry.senses[0].translations[0],
          translation: "phan tich",
        }],
      }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/dictionary/suggest")) {
          return new Response(JSON.stringify({ success: true, data: [suggestion, secondSuggestion] }), {
            status: 200,
          });
        }
        if (url.includes(suggestion.id)) return firstDetail.promise;
        return new Response(JSON.stringify({ success: true, data: secondEntry }), { status: 200 });
      }),
    );
    const { user } = renderWithUser(<DictionaryPageClient />);

    const input = screen.getByPlaceholderText("Search for a word...");
    await user.type(input, "algo");
    await user.click(await screen.findByText("algorithm"));
    await user.click(input);
    await user.click(await screen.findByText("analysis"));
    expect(await screen.findByText("phan tich")).toBeInTheDocument();

    firstDetail.resolve(new Response(JSON.stringify({ success: true, data: dictionaryEntry }), { status: 200 }));

    await waitFor(() => {
      expect(screen.queryByText("thuat toan")).not.toBeInTheDocument();
      expect(screen.getByText("phan tich")).toBeInTheDocument();
    });
  });
});
