import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { resetAiMocks } from "../mocks/ai";
import { resetDbMock } from "../mocks/db";
import { resetSentryMocks } from "../mocks/sentry";

vi.mock("@/lib/core/logger", () => import("../mocks/logger"));
vi.mock("@/lib/db/client", () => import("../mocks/db"));

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
  useTranslations: vi.fn(() => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    t.markup = (key: string) => key;
    t.raw = (key: string) => key;
    return t;
  }),
}));

vi.mock("@/lib/supabase/client", () => import("../mocks/supabase"));
vi.mock("@/lib/supabase/server", () => import("../mocks/supabase"));

afterEach(() => {
  cleanup();
  resetAiMocks();
  resetDbMock();
  resetSentryMocks();
});
