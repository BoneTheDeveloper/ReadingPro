import { screen } from "@testing-library/react";
import { vi } from "vitest";

// Pure helpers only — no hoisted state, no vi.mock-coupled constants.
// vi.mock factories must reference values declared in the same file,
// so each split file declares its own useChatState via vi.hoisted.

export function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

export function translationResponse(translation: string, provider = "dictionary") {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        translation,
        type: "noun phrase",
        provider,
      },
    }),
    { status: 200 },
  );
}

export function vocabularySaveResponse(id = "vocab-1") {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        id,
        selectedText: "algorithmic bias",
        translation: "thiên lệch thuật toán",
        type: "noun phrase",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      },
    }),
    { status: 200 },
  );
}

export function getPopupTranslateButton() {
  return screen
    .getAllByRole("button", { name: /Translate/ })
    .find((btn) => btn.closest(".fixed"))!;
}

export function getSourceListItem(title: string) {
  const sourceTitle = screen.getAllByText(title).find((element) => element.tagName === "H4");
  const sourceListItem = sourceTitle?.closest('[role="button"]');

  if (!(sourceListItem instanceof HTMLElement)) {
    throw new Error(`Source list item not found: ${title}`);
  }

  return sourceListItem;
}

export function defaultFetchHandler() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/translate") {
      return new Response(
        JSON.stringify({
          success: true,
          data: { translation: "thiên lệch thuật toán", type: "noun phrase", provider: "dictionary" },
        }),
        { status: 200 },
      );
    }
    if (url === "/api/vocabulary") return vocabularySaveResponse();
    if (url.startsWith("/api/study/studio/chat")) {
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }
    if (url.startsWith("/api/study/studio/artifacts")) {
      return new Response(JSON.stringify({ success: true, data: { artifacts: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });
}