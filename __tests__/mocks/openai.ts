import { vi } from "vitest";

export const openai = vi.fn((modelId: string) => ({
  modelId,
  provider: "openai-test",
}));
