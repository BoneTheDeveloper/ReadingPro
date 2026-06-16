import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => {
  const mockQueryRaw = vi.fn();
  return {
    db: { $queryRaw: mockQueryRaw },
  };
});

import { db } from "@/server/db/client";
import { resolveQuickDictionaryLookupSql } from "./lookup.service";

const mockQueryRaw = vi.mocked(db.$queryRaw);

beforeEach(() => {
  mockQueryRaw.mockReset();
});

const OPTIONS = { sourceLanguage: "en", targetLanguage: "vi" } as const;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    senseId: "s1",
    targetLanguage: "vi",
    translation: "thuật toán",
    isPrimary: true,
    rank: 1,
    confidence: 0.95,
    status: "reviewed",
    sourceType: "seed",
    sourceName: "reviewed",
    reviewedAt: null,
    matchType: 0,
    ...overrides,
  };
}

describe("resolveQuickDictionaryLookupSql", () => {
  it("returns translation dto on exact headword match", async () => {
    mockQueryRaw.mockResolvedValue([makeRow()]);

    const result = await resolveQuickDictionaryLookupSql("algorithm", OPTIONS);

    expect(result).not.toBeNull();
    expect(result!.translation).toBe("thuật toán");
    expect(result!.sourceLabel).toBeDefined();
    expect(mockQueryRaw).toHaveBeenCalledOnce();
  });

  it("returns translation dto on alias match", async () => {
    mockQueryRaw.mockResolvedValue([makeRow({ matchType: 1 })]);

    const result = await resolveQuickDictionaryLookupSql("algo", OPTIONS);

    expect(result).not.toBeNull();
    expect(result!.translation).toBe("thuật toán");
  });

  it("returns null when no rows found", async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await resolveQuickDictionaryLookupSql("xyzzy", OPTIONS);

    expect(result).toBeNull();
  });

  it("normalizes input term before querying", async () => {
    mockQueryRaw.mockResolvedValue([makeRow()]);

    await resolveQuickDictionaryLookupSql("  Algorithm  ", OPTIONS);

    expect(mockQueryRaw).toHaveBeenCalledOnce();
  });

  it("prefers exact headword over alias via matchType ordering", async () => {
    const exactRow = makeRow({ id: "t-exact", matchType: 0 });
    const aliasRow = makeRow({ id: "t-alias", matchType: 1 });
    mockQueryRaw.mockResolvedValue([exactRow, aliasRow]);

    const result = await resolveQuickDictionaryLookupSql("algorithm", OPTIONS);

    expect(result!.id).toBe("t-exact");
  });

  it("converts Date reviewedAt to ISO string", async () => {
    const date = new Date("2026-01-15T10:00:00Z");
    mockQueryRaw.mockResolvedValue([makeRow({ reviewedAt: date })]);

    const result = await resolveQuickDictionaryLookupSql("algorithm", OPTIONS);

    expect(result!.reviewedAt).toBe("2026-01-15T10:00:00.000Z");
  });

  it("sets sourceLabel from getSourceLabel", async () => {
    mockQueryRaw.mockResolvedValue([makeRow()]);

    const result = await resolveQuickDictionaryLookupSql("algorithm", OPTIONS);

    expect(result!.sourceLabel).toBe("Dictionary");
  });

  it("passes targetLanguage and sourceLanguage to query", async () => {
    mockQueryRaw.mockResolvedValue([makeRow()]);

    await resolveQuickDictionaryLookupSql("test", {
      sourceLanguage: "en",
      targetLanguage: "vi",
    });

    expect(mockQueryRaw).toHaveBeenCalledOnce();
  });
});
