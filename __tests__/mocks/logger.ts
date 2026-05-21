import { vi } from "vitest";

export function createMockLogger() {
  return {
    child: vi.fn(() => createMockLogger()),
    debug: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
  };
}

export const logger = createMockLogger();
export const createModuleLogger = vi.fn(() => createMockLogger());
