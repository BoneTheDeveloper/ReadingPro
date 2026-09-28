import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default defineConfig([
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,

  globalIgnores([
    "build/**",
    ".output/**",
    ".nitro/**",
    ".react-router/**",
    ".vercel/**",
    "coverage/**",
    "src/generated/**",
  ]),

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["src/**/*.tsx"],
    extends: [reactRefresh.configs.vite],
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        {
          // React Router route module exports; the Vite plugin handles their HMR.
          allowExportNames: [
            "meta",
            "links",
            "headers",
            "clientLoader",
            "clientAction",
            "clientMiddleware",
            "shouldRevalidate",
            "handle",
            "HydrateFallback",
            "ErrorBoundary",
            "Layout",
          ],
        },
      ],
    },
  },
]);
