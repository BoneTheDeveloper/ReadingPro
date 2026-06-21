import { describe, expect, it } from "vitest";
import { normalizeText } from "./vocabulary-text-utils";

describe("normalizeText on translation (dedup discriminator)", () => {
  describe("proper-cased Vietnamese translation (e.g. English → Tiếng Anh)", () => {
    it("collapses casing variants to the same key", () => {
      expect(normalizeText("Tiếng Anh")).toBe(normalizeText("tiếng anh"));
      expect(normalizeText("Tiếng Anh")).toBe(normalizeText("  Tiếng Anh  "));
    });

    it("distinguishes a different meaning", () => {
      expect(normalizeText("Tiếng Anh")).not.toBe(normalizeText("Tiếng Việt"));
    });
  });

  describe("normal lowercase translation (e.g. run → chạy)", () => {
    it("collapses casing variants to the same key", () => {
      expect(normalizeText("chạy")).toBe(normalizeText("Chạy"));
      expect(normalizeText("chạy")).toBe(normalizeText("  chạy  "));
    });

    it("distinguishes a different meaning", () => {
      expect(normalizeText("chạy")).not.toBe(normalizeText("chạy bộ"));
    });
  });

  describe("shared normalization rules", () => {
    it("trims surrounding whitespace", () => {
      expect(normalizeText("  tiếng anh  ")).toBe("tiếng anh");
    });

    it("collapses internal whitespace", () => {
      expect(normalizeText("tiếng  anh")).toBe("tiếng anh");
    });
  });
});
