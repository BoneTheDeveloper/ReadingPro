import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),

  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },

        // Tách feature thành 2 nửa: client và server
        { type: "feature-client", pattern: "src/features/*/(ui|hooks)/**", capture: ["name"] },
        { type: "feature-server", pattern: "src/features/*/(services|db)/**", capture: ["name"] },
        // actions.ts + schemas/ + errors/ — cầu nối, cả 2 bên dùng được
        { type: "feature-shared", pattern: "src/features/*/**", capture: ["name"] },

        { type: "components", pattern: "src/components/**" },
        { type: "services", pattern: "src/services/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "i18n", pattern: "src/i18n/**" },
        { type: "types", pattern: "src/types/**" },
      ],
    },
    rules: {
      "boundaries/element-types": ["error", {
        default: "disallow",
        message: "${file.type} không được import ${dependency.type}.",
        rules: [
          // app compose tất cả
          { from: "app", allow: ["app", "feature-shared", "feature-client", "components", "lib", "i18n", "types"] },

          // client của feature: KHÔNG chạm services/db/services-root
          {
            from: "feature-client",
            allow: [
              ["feature-client", { name: "${from.name}" }],
              ["feature-shared", { name: "${from.name}" }],
              "components", "lib", "i18n", "types",
            ],
            message: "Client code (ui, hooks) không được import server layer. Đi qua actions.ts hoặc API route.",
          },

          // server của feature: full quyền, nhưng chỉ trong slice của mình
          {
            from: "feature-server",
            allow: [
              ["feature-server", { name: "${from.name}" }],
              ["feature-shared", { name: "${from.name}" }],
              "services", "lib", "types",
            ],
          },

          // shared trong feature (actions, schemas, errors)
          {
            from: "feature-shared",
            allow: [
              ["feature-shared", { name: "${from.name}" }],
              ["feature-server", { name: "${from.name}" }],
              "services", "lib", "components", "i18n", "types",
            ],
          },

          { from: "components", allow: ["components", "lib", "i18n", "types"] },
          { from: "services",   allow: ["services", "lib", "types"] },
          { from: "lib",        allow: ["lib", "types"] },
          { from: "i18n",       allow: ["i18n", "lib", "types"] },
          { from: "types",      allow: ["types"] },
        ],
      }],

      // Bắt buộc dùng @/ alias cho cross-layer, relative chỉ trong cùng element
      "boundaries/no-private": "off",
    },
  },

  // Rule riêng cho relative path — tách ra block khác để không đè lên nhau
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["../../*", "../../../**"],
          message: "Cross-layer import phải dùng alias @/, không dùng relative path.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
