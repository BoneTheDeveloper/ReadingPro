import { vi } from "vitest";

export const addBreadcrumb = vi.fn();
export const captureException = vi.fn();
export const captureRequestError = vi.fn();
export const captureRouterTransitionStart = vi.fn();
export const init = vi.fn();
export const pinoIntegration = vi.fn((options: unknown) => ({
  name: "pinoIntegration",
  options,
}));
export const replayIntegration = vi.fn(() => ({
  name: "replayIntegration",
}));
export const startSpan = vi.fn((_options: unknown, callback: () => unknown) => callback());
export const withServerActionInstrumentation = vi.fn(
  (_name: string, _options: unknown, callback: () => unknown) => callback(),
);

export const logger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

export function resetSentryMocks() {
  addBreadcrumb.mockReset();
  captureException.mockReset();
  captureRequestError.mockReset();
  captureRouterTransitionStart.mockReset();
  init.mockReset();
  pinoIntegration.mockClear();
  replayIntegration.mockClear();
  startSpan.mockReset();
  startSpan.mockImplementation((_options: unknown, callback: () => unknown) => callback());
  withServerActionInstrumentation.mockReset();
  withServerActionInstrumentation.mockImplementation(
    (_name: string, _options: unknown, callback: () => unknown) => callback(),
  );
  logger.error.mockReset();
  logger.warn.mockReset();
  logger.info.mockReset();
  logger.debug.mockReset();
}
