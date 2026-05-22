import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedProfile, setCachedProfile } from "./auth-cache";
import { getBrowserRedirectOrigin, getSafeNextPath, normalizeOrigin } from "./redirects";
import { syncUser } from "./sync-user";
import { db } from "../db/client";

const profile = {
  id: "user-1",
  email: "reader@example.com",
  name: "Reader",
  avatarUrl: null,
  bio: null,
  targetLevel: "B2" as const,
  tier: "FREE" as const,
  stripeCustomerId: null,
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
};

describe("auth redirect helpers", () => {
  it("normalizes origins and rejects blank values", () => {
    expect(normalizeOrigin(undefined)).toBeUndefined();
    expect(normalizeOrigin("   ")).toBeUndefined();
    expect(normalizeOrigin("example.com///")).toBe("https://example.com");
    expect(normalizeOrigin("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("returns browser origin from window location", () => {
    expect(getBrowserRedirectOrigin()).toBe("http://localhost:3000");
  });

  it("allows relative next paths and falls back for unsafe redirects", () => {
    expect(getSafeNextPath("/study")).toBe("/study");
    expect(getSafeNextPath("/study?tab=cards")).toBe("/study?tab=cards");
    expect(getSafeNextPath("/en/study")).toBe("/en/study");
    expect(getSafeNextPath(null, "/home")).toBe("/home");
    expect(getSafeNextPath("https://evil.test", "/home")).toBe("/home");
    expect(getSafeNextPath("//evil.test", "/home")).toBe("/home");
    expect(getSafeNextPath("/\\evil.test", "/home")).toBe("/home");
    expect(getSafeNextPath("/%5Cevil.test", "/home")).toBe("/home");
    expect(getSafeNextPath("/%5cevil.test", "/home")).toBe("/home");
    expect(getSafeNextPath("/%ZZ", "/home")).toBe("/home");
  });
});

describe("auth-cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached profiles until their token entry expires", () => {
    setCachedProfile("token-a", profile);

    expect(getCachedProfile("token-a")).toEqual(profile);

    vi.setSystemTime(new Date("2026-05-21T00:00:30.001Z"));

    expect(getCachedProfile("token-a")).toBeNull();
  });
});

describe("syncUser", () => {
  it("upserts an auth user profile with null fallbacks", async () => {
    const synced = { ...profile, id: "auth-user-1" };
    vi.mocked(db.userProfile.upsert).mockResolvedValue(synced);

    await expect(syncUser("auth-user-1")).resolves.toBe(synced);

    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: "auth-user-1" },
      update: { email: null, name: null, avatarUrl: null },
      create: { id: "auth-user-1", email: null, name: null, avatarUrl: null },
    });
  });

  it("passes through provided identity fields", async () => {
    await syncUser("auth-user-2", "reader@example.com", "Reader", "https://cdn.test/avatar.png");

    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: "auth-user-2" },
      update: {
        email: "reader@example.com",
        name: "Reader",
        avatarUrl: "https://cdn.test/avatar.png",
      },
      create: {
        id: "auth-user-2",
        email: "reader@example.com",
        name: "Reader",
        avatarUrl: "https://cdn.test/avatar.png",
      },
    });
  });
});
