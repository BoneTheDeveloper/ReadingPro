// Inline of PrismaQueryMetrics to avoid server dependency in shared module
export interface PrismaQueryStepMetrics {
  queries: number;
  ms: number;
}
export interface PrismaQueryMetrics {
  queryCount: number;
  totalDurationMs: number;
  steps: Record<string, PrismaQueryStepMetrics>;
}

export const TRANSLATE_PERFORMANCE_HEADER = "x-translate-perf-metrics";

export type TranslateResolutionSource =
  | "cache"
  | "dictionary"
  | "phrase"
  | "fallback"
  | "google_translate";

export interface TranslateClientMetrics {
  wordsBeforeSelected?: number;
}

export interface TranslatePerformanceSnapshot {
  selectedTextWordCount: number;
  contextWordCount: number;
  wordsBeforeSelected: number | null;
  resolutionSource: TranslateResolutionSource;
  timings: {
    totalMs: number;
    steps: Record<string, number>;
  };
  prisma: PrismaQueryMetrics;
}

const WORD_RE = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;

export function shouldIncludeTranslatePerformanceMetrics(headers: Headers) {
  const value = headers.get(TRANSLATE_PERFORMANCE_HEADER);
  return value === "1" || value === "true";
}

export function countWords(value: string) {
  return value.match(WORD_RE)?.length ?? 0;
}

export function createTranslatePerformanceTracker(input: {
  selectedText: string;
  context: string;
  clientMetrics?: TranslateClientMetrics;
  startedAt?: number;
  initialSteps?: Record<string, number>;
}) {
  return new TranslatePerformanceTracker(input);
}

export function getTranslateResolutionSource(input: {
  provider: TranslateResolutionSource;
  selectedText: string;
}): TranslateResolutionSource {
  if (input.provider === "dictionary" && countWords(input.selectedText) > 1) {
    return "phrase";
  }

  return input.provider;
}

class TranslatePerformanceTracker {
  private readonly startedAt: number;
  private readonly selectedTextWordCount: number;
  private readonly contextWordCount: number;
  private readonly wordsBeforeSelected: number | null;
  private readonly steps = new Map<string, number>();

  constructor(input: {
    selectedText: string;
    context: string;
    clientMetrics?: TranslateClientMetrics;
    startedAt?: number;
    initialSteps?: Record<string, number>;
  }) {
    this.startedAt = input.startedAt ?? performance.now();
    this.selectedTextWordCount = countWords(input.selectedText);
    this.contextWordCount = countWords(input.context);
    this.wordsBeforeSelected = input.clientMetrics?.wordsBeforeSelected ?? null;

    for (const [step, durationMs] of Object.entries(input.initialSteps ?? {})) {
      this.addStepDuration(step, durationMs);
    }
  }

  async measure<T>(step: string, callback: () => Promise<T>): Promise<T> {
    const stepStartedAt = performance.now();
    try {
      return await callback();
    } finally {
      this.addStepDuration(step, performance.now() - stepStartedAt);
    }
  }

  snapshot(input: {
    resolutionSource: TranslateResolutionSource;
    prisma: PrismaQueryMetrics;
  }): TranslatePerformanceSnapshot {
    return {
      selectedTextWordCount: this.selectedTextWordCount,
      contextWordCount: this.contextWordCount,
      wordsBeforeSelected: this.wordsBeforeSelected,
      resolutionSource: input.resolutionSource,
      timings: {
        totalMs: roundMetric(performance.now() - this.startedAt),
        steps: Object.fromEntries(this.steps.entries()),
      },
      prisma: input.prisma,
    };
  }

  private addStepDuration(step: string, durationMs: number) {
    this.steps.set(step, roundMetric((this.steps.get(step) ?? 0) + durationMs));
  }
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
