import { vi } from "vitest";

export function createSupabaseClientMock() {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.test/file" } })),
        upload: vi.fn(),
      })),
    },
  };
}

export const supabaseClientMock = createSupabaseClientMock();

export const createClient = vi.fn(() => supabaseClientMock);
export const createServerActionClient = vi.fn(async () => supabaseClientMock);
export const createServerComponentClient = vi.fn(async () => supabaseClientMock);
