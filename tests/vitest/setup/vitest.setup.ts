import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import enMessages from "../../../localization/messages/en.json";
import { resetAiMocks } from "../mocks/ai";
import { resetDbMock } from "../mocks/db";
import { resetSentryMocks } from "../mocks/sentry";

// server-only throws at runtime in non-Next.js environments (e.g. Vitest/jsdom).
// Mock it as a no-op so tests can import server modules without crashing.
vi.mock("server-only", () => ({}));

vi.mock("@/server/core/logger", () => import("../mocks/logger"));
vi.mock("@/server/db/client", () => import("../mocks/db"));

vi.mock("ai", async (importActual) => {
  const actual = await importActual<typeof import("ai")>();
  const aiMock = await import("../mocks/ai");

  return {
    ...actual,
    convertToModelMessages: aiMock.convertToModelMessages,
    generateObject: aiMock.generateObject,
    streamText: aiMock.streamText,
  };
});

vi.mock("@ai-sdk/openai", () => import("../mocks/openai"));

vi.mock("@sentry/nextjs", () => import("../mocks/sentry"));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

type TranslationValues = Record<string, string | number | Date>;

function resolveTranslation(namespace: string | undefined, key: string, values?: TranslationValues) {
  const path = namespace ? `${namespace}.${key}` : key;
  const message = path
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      enMessages,
    );

  const template = typeof message === "string" ? message : key;

  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    values[name] === undefined ? `{${name}}` : String(values[name]),
  );
}

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useFormatter: vi.fn(() => ({
    dateTime: (value: Date | number | string) => String(value),
    number: (value: number) => String(value),
    relativeTime: (value: Date | number | string) => String(value),
  })),
  useLocale: vi.fn(() => "en"),
  useMessages: vi.fn(() => ({})),
  useNow: vi.fn(() => new Date("2026-05-21T00:00:00.000Z")),
  useTranslations: vi.fn((namespace?: string) => {
    const t = (key: string, values?: TranslationValues) =>
      resolveTranslation(namespace, key, values);
    t.rich = (key: string, values?: TranslationValues) =>
      resolveTranslation(namespace, key, values);
    t.markup = (key: string, values?: TranslationValues) =>
      resolveTranslation(namespace, key, values);
    t.raw = (key: string) => resolveTranslation(namespace, key);
    return t;
  }),
}));

afterEach(() => {
  cleanup();
  resetAiMocks();
  resetDbMock();
  resetSentryMocks();
});
