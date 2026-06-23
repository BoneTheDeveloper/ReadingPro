import { describe, expect, it } from "vitest";
import { normalizeText } from "./vocabulary-text-utils";

describe("normalizeText on translation (dedup discriminator)", () => {
  it("collapses casing and whitespace variants to the same key", () => {
    expect(normalizeText("Tiếng Anh")).toBe(normalizeText("tiếng anh"));
    expect(normalizeText("Tiếng Anh")).toBe(normalizeText("  Tiếng Anh  "));
    expect(normalizeText("chạy")).toBe(normalizeText("Chạy"));
  });

  it("distinguishes different meanings by token composition", () => {
    expect(normalizeText("Tiếng Anh")).not.toBe(normalizeText("Tiếng Việt"));
    expect(normalizeText("chạy")).not.toBe(normalizeText("chạy bộ"));
  });

  it("trims and collapses internal whitespace", () => {
    expect(normalizeText("  tiếng anh  ")).toBe("tiếng anh");
    expect(normalizeText("tiếng  anh")).toBe("tiếng anh");
  });
});
