import { act, renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, supabaseClientMock } from "../../../__tests__/mocks/supabase";
import { useSignOut } from "./use-sign-out";

describe("useSignOut", () => {
  const router = {
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(router);
    supabaseClientMock.auth.signOut.mockResolvedValue({ error: null });
  });

  it("signs out and sends the user to the sign-in page", async () => {
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current();
    });

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(supabaseClientMock.auth.signOut).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/sign-in");
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("logs the error and does not navigate when Supabase sign-out fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseClientMock.auth.signOut.mockResolvedValue({ error: { message: "Session expired" } });
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current();
    });

    expect(consoleError).toHaveBeenCalledWith("Sign out failed:", "Session expired");
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
