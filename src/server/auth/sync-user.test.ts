import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db/client";
import { userProfileFixture } from "@tests/vitest/fixtures/user";

// Clerk must never be called from ensureUserProfile — no import needed, but guard via mock
const clerkMocks = vi.hoisted(() => ({
  clerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkMocks.clerkClient,
}));

import { ensureUserProfile } from "./sync-user";

describe("ensureUserProfile", () => {
  beforeEach(() => {
    clerkMocks.clerkClient.mockReset();
  });

  it("upserts a minimal row with create:{id} and update:{} (no-op on existing)", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await ensureUserProfile(userProfileFixture.id);

    expect(db.userProfile.upsert).toHaveBeenCalledOnce();
    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: userProfileFixture.id },
      update: {},
      create: { id: userProfileFixture.id },
    });
  });

  it("is idempotent: calling twice does not throw", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await expect(ensureUserProfile(userProfileFixture.id)).resolves.toBeUndefined();
    await expect(ensureUserProfile(userProfileFixture.id)).resolves.toBeUndefined();
    expect(db.userProfile.upsert).toHaveBeenCalledTimes(2);
  });

  it("never calls clerkClient", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await ensureUserProfile(userProfileFixture.id);

    expect(clerkMocks.clerkClient).not.toHaveBeenCalled();
  });
});
