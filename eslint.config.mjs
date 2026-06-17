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
    ".next-performance/**",
    ".next-performance-production/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/features/**/ui/**", "src/features/**/hooks/**", "src/contracts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/**", "**/server/**"],
              message: "Frontend features and shared contracts must not import from the server directory. Use standard API routes instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../app/*",
                "../../server/*",
                "../../contracts/*",
                "../../features/*",
                "../../ui/*",
                "../../../**",
              ],
              message: "Cross-layer imports must use the @/ alias, not relative paths.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
