import { vi } from "vitest";

export function createMockLogger(bindings: Record<string, unknown> = {}) {
  return {
    bindings: vi.fn(() => bindings),
    child: vi.fn((context: Record<string, unknown> = {}) =>
      createMockLogger({ ...bindings, ...context }),
    ),
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
export const createRequestLogContext = vi.fn(
  (
    request: { headers?: Headers; nextUrl?: { pathname?: string } },
    method: string,
    fallbackPath: string,
  ) => ({
    requestId:
      request.headers?.get("x-request-id") ??
      request.headers?.get("x-vercel-id") ??
      undefined,
    path: request.nextUrl?.pathname ?? fallbackPath,
    method,
  }),
);
export const createRequestLogger = vi.fn(
  (module: string, requestContext: Record<string, unknown>) =>
    createMockLogger({ module, context: requestContext }),
);
