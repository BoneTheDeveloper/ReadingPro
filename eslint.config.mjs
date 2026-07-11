import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // Prisma client is generated code.
    "src/generated/**",
  ]),
  {
    // Client-side feature code (components + hooks) must not reach into the
    // server-only layers. Server logic lives in each feature's `services/`
    // (Business logic - Server) and `db/` (Repositories), plus the top-level
    // `services/` cross-cutting integrations (AI, Inngest, storage).
    files: ["src/features/**/ui/**", "src/features/**/hooks/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/services/**",
                "@/features/*/services/**",
                "@/features/*/db/**",
                "**/services/**",
                "**/db/**",
              ],
              message:
                "Frontend feature code (ui, hooks) must not import server-only layers (services, db). Use Server Actions or API routes instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Cross-layer imports must go through the @/ alias, not relative paths.
    // Top-level layers: app, components, features, i18n, lib, services, types.
    files: ["src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../app/**",
                "../../components/**",
                "../../features/**",
                "../../i18n/**",
                "../../lib/**",
                "../../services/**",
                "../../types/**",
                "../../../**",
              ],
              message:
                "Cross-layer imports must use the @/ alias, not relative paths.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
