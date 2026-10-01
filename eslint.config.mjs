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
    "src/server/db/generated/**",
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

  // Runtime boundaries: the browser bundle and the Nitro server only meet in src/shared.
  {
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server/*"],
          message: "Client code may only reach the server through src/shared contracts.",
        }, {
          group: ["@/client/features/*/*"],
          message: "Import a feature through its index.ts.",
        }],
      }],
    },
  },
  {
    files: ["src/server/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/client/*"],
          message: "Server code must not import client modules; move shared code to src/shared.",
        }, {
          group: ["@/server/modules/*/*"],
          message: "Import a server module through its index.ts.",
        }],
      }],
    },
  },
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^@/(?!shared/)",
          message: "src/shared may only import other shared modules.",
        }],
      }],
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
