import { beforeEach, describe, expect, it, vi } from "vitest";
import { userProfileFixture } from "@tests/vitest/fixtures/user";
import { db } from "../db/client";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  protect: vi.fn(),
  getUser: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => {
  // `auth` is callable and also exposes a static `protect()` (Clerk AuthFn shape).
  Object.assign(clerkMocks.auth, { protect: clerkMocks.protect });
  return { auth: clerkMocks.auth, clerkClient: clerkMocks.clerkClient };
});

import {
  AuthenticationRequiredError,
  getCurrentUser,
  getPageUserId,
  getUserId,
  requireAuth,
} from "./auth-utils";

describe("Clerk auth profile bootstrap", () => {
  beforeEach(() => {
    clerkMocks.auth.mockReset();
    clerkMocks.protect.mockReset();
    clerkMocks.getUser.mockReset();
    clerkMocks.clerkClient.mockReset();
    clerkMocks.clerkClient.mockResolvedValue({
      users: { getUser: clerkMocks.getUser },
    });
  });

  it("returns null and throws the typed auth error without a Clerk session", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(requireAuth()).rejects.toBeInstanceOf(AuthenticationRequiredError);
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it("refreshes an existing profile from Clerk identity metadata", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: userProfileFixture.id });
    clerkMocks.getUser.mockResolvedValue({
      id: userProfileFixture.id,
      firstName: "Test",
      fullName: "Updated Reader",
      imageUrl: "https://img.example.test/updated-avatar.png",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        { id: "email_1", emailAddress: "updated-reader@example.test" },
      ],
    });
    vi.mocked(db.userProfile.upsert).mockResolvedValue({
      ...userProfileFixture,
      email: "updated-reader@example.test",
      name: "Updated Reader",
      avatarUrl: "https://img.example.test/updated-avatar.png",
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      email: "updated-reader@example.test",
      name: "Updated Reader",
      avatarUrl: "https://img.example.test/updated-avatar.png",
    });
    expect(clerkMocks.clerkClient).toHaveBeenCalled();
    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: userProfileFixture.id },
      update: {
        email: "updated-reader@example.test",
        name: "Updated Reader",
        avatarUrl: "https://img.example.test/updated-avatar.png",
      },
      create: {
        id: userProfileFixture.id,
        email: "updated-reader@example.test",
        name: "Updated Reader",
        avatarUrl: "https://img.example.test/updated-avatar.png",
      },
    });
  });

  it("getUserId returns the verified id from the session JWT without Clerk or DB calls", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: userProfileFixture.id });

    await expect(getUserId()).resolves.toBe(userProfileFixture.id);
    expect(clerkMocks.clerkClient).not.toHaveBeenCalled();
    expect(clerkMocks.getUser).not.toHaveBeenCalled();
    expect(db.userProfile.upsert).not.toHaveBeenCalled();
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it("getUserId throws the typed auth error without a Clerk session", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: null });

    await expect(getUserId()).rejects.toBeInstanceOf(AuthenticationRequiredError);
    expect(clerkMocks.clerkClient).not.toHaveBeenCalled();
  });

  it("getPageUserId returns the id via auth.protect without Clerk or DB calls", async () => {
    clerkMocks.protect.mockResolvedValue({ userId: userProfileFixture.id });

    await expect(getPageUserId()).resolves.toBe(userProfileFixture.id);
    expect(clerkMocks.protect).toHaveBeenCalled();
    expect(clerkMocks.clerkClient).not.toHaveBeenCalled();
    expect(db.userProfile.upsert).not.toHaveBeenCalled();
  });

  it("upserts a missing profile from Clerk identity metadata", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: userProfileFixture.id });
    vi.mocked(db.userProfile.findUnique).mockResolvedValue(null);
    clerkMocks.getUser.mockResolvedValue({
      id: userProfileFixture.id,
      firstName: "Test",
      fullName: "Test Reader",
      imageUrl: "https://img.example.test/avatar.png",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        { id: "email_1", emailAddress: userProfileFixture.email },
      ],
    });
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await expect(getCurrentUser()).resolves.toBe(userProfileFixture);
    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: userProfileFixture.id },
      update: {
        email: userProfileFixture.email,
        name: "Test Reader",
        avatarUrl: "https://img.example.test/avatar.png",
      },
      create: {
        id: userProfileFixture.id,
        email: userProfileFixture.email,
        name: "Test Reader",
        avatarUrl: "https://img.example.test/avatar.png",
      },
    });
  });
});
