import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Tier 1 — real failure surface. Gates the 80% line threshold.
// Files here represent state machines, race conditions, contract envelopes,
// or non-obvious invariants the type system cannot enforce.
const appLogicCoverageInclude = [
  // Server modules with races, transactions, and non-trivial DB logic
  "src/server/db/passage-queries.ts",
  "src/server/db/study-session-queries.ts",
  "src/server/db/quiz/quiz-review.ts",
  "src/server/auth/sync-user.ts",
  "src/server/auth/auth-utils.ts",
  "src/server/modules/spaced-repetition/scheduler.ts",
  "src/server/modules/upload/content-analysis/content-analysis.service.ts",
  "src/server/modules/study/passage/passage-study.service.ts",
  // Feature hooks — React state machines, async races
  "src/features/study/hooks/use-study-workspace-state.ts",
  "src/features/study/hooks/use-study-actions.ts",
  "src/features/study/hooks/use-study-panel-layout.ts",
  // Feature API clients — request/response shape contracts
  "src/features/study/api-client/studio-questions-client.ts",
  "src/features/study/api-client/study-session-client.ts",
  // Feature services — orchestration across modules
  "src/server/modules/upload/upload-workflow.ts",
  // HTTP routes — the actual public contract surface
  "src/app/api/upload/route.ts",
  "src/app/api/upload/text/route.ts",
  "src/app/api/progress/stats/route.ts",
  "src/app/api/study/sessions/route.ts",
  "src/app/api/study/studio/questions/route.ts",
  "src/app/api/study/studio/chat/route.ts",
];

// Tier 2 — pure helpers. Coverage is reported but does not fail CI.
// Pure functions hit ~100% by construction, so the global 80% gate is
// driven almost entirely by Tier 1. Remove a file from Tier 2 only if
// it has branches that can fail silently.
const appLogicCoverageSoftInclude = [
  "src/contracts/reading-utils.ts",
  "src/contracts/domain/cefr.ts",
  "src/features/study/ui/cefr-style.ts",
  "src/server/ai/prompt-utils.ts",
  "src/server/db/vocabulary-text-utils.ts",
  "src/features/study/hooks/selection-utils.ts",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "@tests": path.resolve(process.cwd(), "tests"),
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
      include: [...appLogicCoverageInclude, ...appLogicCoverageSoftInclude],
    },
  },
});
