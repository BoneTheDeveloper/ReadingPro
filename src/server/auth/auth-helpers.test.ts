import { describe, expect, it, vi } from "vitest";
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
