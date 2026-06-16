import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const appLogicCoverageInclude = [
  "src/lib/shared/reading-utils.ts",
  "src/lib/domain/cefr.ts",
  "src/lib/spaced-repetition/scheduler.ts",
  "src/lib/validation/upload.ts",
  "src/lib/auth/sync-user.ts",
  "src/lib/auth/auth-utils.ts",
  "src/lib/ai/prompt-utils.ts",
  "src/lib/db/quiz/quiz-review.ts",
  "src/lib/db/passage-queries.ts",
  "src/lib/db/study-session-queries.ts",
  "src/lib/ui/cefr-style.ts",
  "src/features/study/hooks/use-study-workspace-state.ts",
  "src/features/study/hooks/use-study-actions.ts",
  "src/features/study/hooks/use-study-panel-layout.ts",
  "src/features/study/api/studio-questions-client.ts",
  "src/features/study/api/quiz-attempt-client.ts",
  "src/lib/upload/content-analysis/content-analysis.service.ts",
  "src/features/upload/services/upload-workflow.ts",
  "src/features/upload/actions/analyze-content-action.ts",
  "src/lib/study/passage/passage-study.service.ts",
  "src/features/study/actions/*.ts",
  "src/app/api/cards/due/route.ts",
  "src/app/api/cards/review/route.ts",
  "src/app/api/progress/stats/route.ts",
  "src/app/api/study-session/route.ts",
  "src/app/api/studio-questions/route.ts",
  "src/app/api/study-chat/route.ts",
  "src/app/api/upload/route.ts",
  "src/app/api/upload/text/route.ts",
  "src/lib/core/sentry.ts",
  "src/lib/core/logger.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "src/instrumentation.ts",
  "src/instrumentation-client.ts",
  "src/app/global-error.tsx",
  "src/app/api/sentry-example-api/route.ts",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    setupFiles: ["./tests/vitest/setup/vitest.setup.ts"],
    include: [
      "tests/vitest/**/*.{test,spec}.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage",
      include: appLogicCoverageInclude,
      thresholds: {
        lines: 80,
      },
    },
  },
});
