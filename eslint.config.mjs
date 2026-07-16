import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";

// =============================================================================
// LAYER DEFINITIONS
// =============================================================================
// Match docs/code-standards.md layer definitions
// NOTE: boundaries/elements uses FOLDER patterns only (not file patterns)

const LAYERS = {
  // Client-side
  PAGE: "page",           // app/[locale]/ (folder-based)
  COMPONENT: "component", // features/*/(components|hooks)/**, src/components/**

  // Server-side
  ACTION: "action",        // features/*/server/actions/**
  ROUTE: "route",         // app/api/ (folder-based)
  SERVICE: "service",     // features/*/server/services/**
  REPOSITORY: "repository", // features/*/server/db/**

  // Shared
  SCHEMA: "schema",       // features/*/schemas/**
  DTO: "dto",            // features/*/server/services/ (folder-based for DTOs)

  // Core
  LIB: "lib",             // src/lib/**
  TYPES: "types",         // src/types/**
  ROOT: "root",           // features/*/ (feature root folders)
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const isType = (...types) => ({ element: { type: types } });

// Cross-feature allowed types (types, schemas, services - per code-standards.md)
// "Cross-feature imports: Allowed for types/DTOs, discouraged for services"
const CROSS_FEATURE_ALLOWED = [
  LAYERS.DTO,
  LAYERS.TYPES,
  LAYERS.SCHEMA,
  LAYERS.LIB,
  LAYERS.SERVICE, // Route can import services from other features
];

// Same-feature allowed types
const sameFeature = (...types) =>
  types.map((type) => ({
    element: { type, captured: { name: "{{ from.element.captured.name }}" } },
  }));

// =============================================================================
// BOUNDARY POLICIES
// =============================================================================
// Based on docs/code-standards.md "Allowed imports" table

const policies = [
  // ---------------------------------------------------------------------------
  // PAGE (Client) — app/[locale]/**
  // Allowed: components, actions, schemas, DTOs, lib, ROOT (barrel files)
  // NOTE: Page CAN import services directly (Server Component pattern)
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.PAGE),
    allow: {
      to: [
        LAYERS.COMPONENT,
        "components", // src/components/**
        LAYERS.ACTION,
        LAYERS.SCHEMA,
        LAYERS.DTO,
        LAYERS.SERVICE, // Server Component can call services directly
        LAYERS.LIB,
        LAYERS.ROOT, // Allow importing from feature barrel files
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // COMPONENT (Client) — features/*/(components|hooks)/**, src/components/**
  // Allowed: same-feature: components, actions, schemas, DTOs, ROOT, lib
  // Cross-feature: can import actions (for server calls)
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.COMPONENT),
    allow: {
      to: [
        ...sameFeature(LAYERS.COMPONENT, LAYERS.ACTION, LAYERS.SCHEMA, LAYERS.ROOT),
        "components", // src/components/**
        LAYERS.DTO,
        LAYERS.LIB,
        LAYERS.TYPES,
        LAYERS.ACTION, // Cross-feature actions allowed
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // ACTION — features/*/server/actions/**
  // Allowed: schemas (InputSchema), services, DTOs, lib
  // NOT: repositories (bypass authorization)
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.ACTION),
    allow: {
      to: [
        ...sameFeature(LAYERS.SERVICE, LAYERS.SCHEMA, LAYERS.ACTION),
        LAYERS.DTO,
        LAYERS.LIB,
        LAYERS.ROOT, // Allow calling other feature's service via barrel
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // ROUTE — app/api/**/route.ts
  // Allowed: schemas (InputSchema/QuerySchema), services, lib
  // Cross-feature: can import services (via barrel) and schemas
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.ROUTE),
    allow: {
      to: [
        ...sameFeature(LAYERS.SERVICE, LAYERS.SCHEMA),
        LAYERS.SCHEMA, // Cross-feature schemas allowed
        LAYERS.SERVICE, // Cross-feature services allowed (via barrel)
        LAYERS.DTO,
        LAYERS.LIB,
        LAYERS.ROOT,
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // SERVICE — features/*/server/services/**
  // Allowed: other services (with caution), repositories, schemas, lib
  // Cross-feature: services discouraged but allowed for types/DTOs
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.SERVICE),
    allow: {
      to: [
        ...sameFeature(LAYERS.SERVICE, LAYERS.REPOSITORY, LAYERS.SCHEMA),
        LAYERS.DTO,
        LAYERS.LIB,
        LAYERS.ROOT,
        // Cross-feature: only via barrel (service-to-service is discouraged)
        ...CROSS_FEATURE_ALLOWED,
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // REPOSITORY — features/*/server/db/**
  // Allowed: lib, types, same-feature ROOT (for barrel exports)
  // NOT: services, actions, routes
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.REPOSITORY),
    allow: {
      to: [LAYERS.LIB, LAYERS.TYPES, ...sameFeature(LAYERS.ROOT)],
    },
  },

  // ---------------------------------------------------------------------------
  // SCHEMA — features/*/schemas/**
  // Allowed: lib (zod), types, same-feature ROOT (for barrel exports)
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.SCHEMA),
    allow: {
      to: [LAYERS.LIB, LAYERS.TYPES, ...sameFeature(LAYERS.ROOT)],
    },
  },

  // ---------------------------------------------------------------------------
  // DTO — features/*/server/services/ (folder), src/types/**
  // Allowed: types, lib, same-feature ROOT (for barrel exports)
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.DTO),
    allow: {
      to: [LAYERS.TYPES, LAYERS.LIB, ...sameFeature(LAYERS.ROOT)],
    },
  },

  // ---------------------------------------------------------------------------
  // ROOT — features/*/**
  // Catch-all for feature root level (e.g., barrel files at features/<f>/)
  // Allowed: all internal layers + lib + cross-feature types/DTOs
  // ---------------------------------------------------------------------------
  {
    from: isType(LAYERS.ROOT),
    allow: {
      to: [
        ...sameFeature(
          LAYERS.ROOT,
          LAYERS.SERVICE,
          LAYERS.REPOSITORY,
          LAYERS.SCHEMA,
          LAYERS.ACTION,
          LAYERS.COMPONENT
        ),
        LAYERS.DTO,
        LAYERS.LIB,
        LAYERS.TYPES,
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // CORE LAYERS — src/components/**, src/services/**, src/lib/**, src/types/**
  // ---------------------------------------------------------------------------
  {
    from: isType("components"),
    allow: {
      to: [LAYERS.LIB, LAYERS.TYPES, LAYERS.DTO, LAYERS.SCHEMA],
    },
  },
  {
    from: isType("services"),
    allow: {
      to: [LAYERS.LIB, LAYERS.TYPES, LAYERS.ROOT],
    },
  },
  {
    from: isType(LAYERS.LIB),
    allow: {
      to: [LAYERS.LIB, LAYERS.TYPES],
    },
  },
  {
    from: isType(LAYERS.TYPES),
    allow: {
      to: [LAYERS.TYPES],
    },
  },
];

// =============================================================================
// ESLINT CONFIG
// =============================================================================

export default defineConfig([
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
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries, "import-x": importX },
    settings: {
      "boundaries/include": ["**/*.{ts,tsx}"],
      "boundaries/legacy-warnings": false,
      "boundaries/elements": [
        // ===================================================================
        // CLIENT-SIDE LAYERS (folder-based)
        // ===================================================================
        {
          type: LAYERS.PAGE,
          pattern: "app/[locale]/**",
        },
        {
          type: LAYERS.COMPONENT,
          pattern: "features/*/components/**",
          capture: ["name"],
        },
        {
          type: LAYERS.COMPONENT,
          pattern: "features/*/hooks/**",
          capture: ["name"],
        },
        {
          type: "components",
          pattern: "src/components/**",
        },

        // ===================================================================
        // SERVER-SIDE LAYERS (folder-based)
        // ===================================================================
        {
          type: LAYERS.ACTION,
          pattern: "features/*/server/actions/**",
          capture: ["name"],
        },
        {
          type: LAYERS.ROUTE,
          pattern: "app/api/**",
        },
        {
          type: LAYERS.SERVICE,
          pattern: "features/*/server/services/**",
          capture: ["name"],
        },
        {
          type: LAYERS.REPOSITORY,
          pattern: "features/*/server/db/**",
          capture: ["name"],
        },
        {
          type: LAYERS.SCHEMA,
          pattern: "features/*/schemas/**",
          capture: ["name"],
        },
        {
          type: LAYERS.DTO,
          pattern: "features/*/server/services/**",
        },
        {
          type: LAYERS.DTO,
          pattern: "src/types/**",
        },

        // ===================================================================
        // CORE/UTILITY LAYERS (folder-based)
        // ===================================================================
        {
          type: "services",
          pattern: "src/services/**",
        },
        {
          type: LAYERS.LIB,
          pattern: "src/lib/**",
        },
        {
          type: LAYERS.TYPES,
          pattern: "src/types/**",
        },

        // ===================================================================
        // FEATURE ROOT (folder-based)
        // ===================================================================
        {
          type: LAYERS.ROOT,
          pattern: "features/*",
          capture: ["name"],
        },
      ],
    },
    rules: {
      // =======================================================================
      // RULE 1: Block deep relative imports (../../*/**)
      // Cross-layer import phải dùng alias @/, không dùng relative path
      // =======================================================================
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../*/**", "../../../**"],
              message:
                "Cross-layer import phải dùng alias @/, không dùng relative path. Ví dụ: import { x } from '@/features/dictionary' thay vì import { x } from '../../features/dictionary'",
            },
          ],
        },
      ],

      // =======================================================================
      // RULE 2: Feature boundaries (folder-based via boundaries plugin)
      // =======================================================================
      "boundaries/element-types": "off",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies,
        },
      ],

      // =======================================================================
      // RULE 3: File-specific import restrictions via import-x
      // Enforces code-standards.md layer rules for specific files
      // =======================================================================
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // page.tsx cannot import server-only code directly
            {
              target: ["app/[locale]/**/page.tsx"],
              from: [
                "features/*/server/**",
                "src/services/**",
              ],
              message: "Page (client) cannot import server-only code. Use Server Actions instead.",
            },
            // Route cannot import repositories directly
            {
              target: ["app/api/**/route.ts"],
              from: [
                "features/*/server/db/**",
              ],
              message: "API Route cannot import repositories directly. Use services instead.",
            },
            // Action cannot import repositories directly
            {
              target: ["features/*/server/actions/**"],
              from: [
                "features/*/server/db/**",
              ],
              message: "Server Action cannot import repositories directly. Use services instead.",
            },
            // Components/hooks cannot import server-only code
            {
              target: ["features/*/(components|hooks)/**"],
              from: [
                "features/*/server/**",
                "src/services/**",
              ],
              message: "Component/Hook (client) cannot import server-only code.",
            },
          ],
        },
      ],
    },
  },
]);
