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
      "boundaries/legacy-warnings": false,

      // THỨ TỰ QUAN TRỌNG: cụ thể trước, bao quát sau.
      "boundaries/elements": [
        { type: "feature-client",  pattern: "src/features/*/(ui|hooks)/**",                capture: ["name"] },
        { type: "feature-service", pattern: "src/features/*/services/**",                  capture: ["name"] },
        { type: "feature-repo",    pattern: "src/features/*/db/**",                        capture: ["name"] },
        { type: "feature-shared",  pattern: "src/features/*/(schemas|errors|lib|types)/**", capture: ["name"] },
        // fallback: actions.ts + file lẻ còn lại trong feature
        { type: "feature-shared",  pattern: "src/features/*/**",                           capture: ["name"] },

        { type: "app",        pattern: "src/app/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "services",   pattern: "src/services/**" },
        { type: "lib",        pattern: "src/lib/**" },
        { type: "i18n",       pattern: "src/i18n/**" },
        { type: "types",      pattern: "src/types/**" },
      ],

      // actions.ts là FILE, không phải folder → dùng file descriptor thay cho mode:"file"
      "boundaries/files": [
        { pattern: "src/features/*/action.ts", category: "action" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "disallow",
        message: "{{ from.element.type }} không được import {{ to.element.type }} ({{ to.module.source }}).",
        policies: [
          // ---------- app: composition root ----------
          {
            from: { element: { type: "app" } },
            allow: {
              to: {
                element: {
                  type: [
                    "app",
                    "feature-client",
                    "feature-shared",
                    "feature-service",
                    "components", "services", "lib", "i18n", "types",
                  ],
                },
              },
            },
          },
          {
            from: { element: { type: "app" } },
            disallow: { to: { element: { type: "feature-repo" } } },
            message: "app/ không gọi thẳng repository. Đi qua service của feature.",
          },

          // ---------- feature-client: ui + hooks ----------
          {
            from: { element: { type: "feature-client" } },
            allow: {
              to: [
                { element: { type: "feature-client", captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: "feature-shared", captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: ["components", "lib", "i18n", "types", "services", "app", "feature-service", "feature-shared"] } },
              ],
            },
            message: "Client (ui, hooks) chỉ dùng actions.ts + schemas của chính feature mình.",
          },

          // ---------- feature-service: nghiệp vụ ----------
          {
            from: { element: { type: "feature-service" } },
            allow: {
              to: [
                { element: { type: "feature-service", captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: "feature-repo",    captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: "feature-shared",  captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: ["services", "lib", "types", "feature-service", "feature-repo", "feature-shared"] } },
              ],
            },
          },

          // ---------- feature-repo: chỉ Prisma ----------
          {
            from: { element: { type: "feature-repo" } },
            allow: {
              to: [
                { element: { type: "feature-repo",   captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: "feature-shared", captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: ["lib", "types"] } },
              ],
            },
            message: "Repository chỉ chạm Prisma + schema. Không gọi service.",
          },

          // ---------- feature-shared: schema, error, type ----------
          // PHẢI đứng TRƯỚC policy "action".
          // actions.ts khớp CẢ HAI (element=feature-shared + file category=action).
          // Policy khớp SAU sẽ thắng → để "action" ở dưới để nó ghi đè, mở rộng quyền.
          {
            from: { element: { type: "feature-shared" } },
            allow: {
              to: [
                { element: { type: "feature-shared", captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: ["lib", "types"] } },
              ],
            },
            message: "schemas/errors là tầng đáy — không import service, repo, hay feature khác.",
          },

          // ---------- actions.ts: cầu nối "use server" ----------
          // Đứng SAU feature-shared → ghi đè, cho phép gọi service.
          {
            from: { file: { categories: "action" } },
            allow: {
              to: [
                { element: { type: "feature-service", captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: "feature-repo",    captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: "feature-shared",  captured: { name: "{{ from.element.captured.name }}" } } },
                { element: { type: ["services", "lib", "types", "components"] } },
              ],
            },
            message: "actions.ts chỉ gọi service + schema của chính feature mình.",
          },

          // ---------- tầng chung ----------
          { from: { element: { type: "components" } }, allow: { to: { element: { type: ["components", "lib", "i18n", "types"] } } } },
          { from: { element: { type: "services"   } }, allow: { to: { element: { type: ["services", "lib", "types"] } } } },
          { from: { element: { type: "lib"        } }, allow: { to: { element: { type: ["lib", "types"] } } } },
          { from: { element: { type: "i18n"       } }, allow: { to: { element: { type: ["i18n", "lib", "types"] } } } },
          { from: { element: { type: "types"      } }, allow: { to: { element: { type: "types" } } } },
        ],
      }],
    },
  },

  // Tách block riêng — nếu để chung sẽ đè lên nhau
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
