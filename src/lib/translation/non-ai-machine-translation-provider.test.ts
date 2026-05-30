import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translateWithNonAiProvider } from "./non-ai-machine-translation-provider";

describe("translateWithNonAiProvider", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const urlString = String(url);
        if (urlString.includes("translate.googleapis.com")) {
          return new Response(
            JSON.stringify([[["Xin chào", "Hello", null, null, 0]], null, "en", null]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns translation with google_translate provider on success", async () => {
    const result = await translateWithNonAiProvider({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "vi",
    });

    expect(result).toEqual({
      translation: "Xin chào",
      provider: "google_translate",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("translate.googleapis.com"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("throws on non-OK HTTP response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));

    await expect(
      translateWithNonAiProvider({
        text: "Hello",
        sourceLanguage: "en",
        targetLanguage: "vi",
      }),
    ).rejects.toThrow("Non-AI provider returned status 502");
  });

  it("throws on network failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(
      translateWithNonAiProvider({
        text: "Hello",
        sourceLanguage: "en",
        targetLanguage: "vi",
      }),
    ).rejects.toThrow("fetch failed");
  });

  it("throws on empty translation response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([[], null, "en"]), { status: 200 }),
    );

    await expect(
      translateWithNonAiProvider({
        text: "Hello",
        sourceLanguage: "en",
        targetLanguage: "vi",
      }),
    ).rejects.toThrow("Non-AI provider returned empty translation");
  });
});
