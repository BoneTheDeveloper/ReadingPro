# ADR 0005: Enforced Server-Frontend Boundary

## Status
Accepted

## Context
The application originally had an informal boundary between frontend and backend. While most backend code lived in `src/lib`, it was technically possible for client components to import server-only logic, leading to build-time errors or bundle bloat. Additionally, the use of Server Actions created a tight coupling between the frontend and the Next.js runtime, making it difficult to extract the backend into a standalone service (e.g., Hono) for future mobile or secondary client support.

## Decision
We decided to formalize and enforce a strict boundary between the Frontend and Backend using a 4-layer architecture and the standard HTTP transport.

### 1. Target Layout
- **`src/app/`**: Thin routing layer. Pages compose features; API routes adapt HTTP to server modules.
- **`src/server/`**: Backend-only layer. Enforced with `import 'server-only'`. Contains database, AI, auth, and business modules.
- **`src/shared/`**: Isomorphic contract layer. Contains Zod schemas and DTO types. Must stay pure (no server-only imports).
- **`src/features/`**: Frontend feature layer. Organized by domain (ui, hooks, model, api).

### 2. Invariant Rules
1. **Server-Only Enforcement**: All files in `src/server/` must include `import 'server-only'`. The build must fail if any client component imports from this directory.
2. **API Access Only**: Frontend features must communicate with the backend exclusively through their internal `api/` clients calling standard HTTP `/api/*` routes.
3. **Pure Shared Layer**: `src/shared/` must never import from `src/server/`. It serves as the single source of truth for the API contract.
4. **Domain Mirroring**: Folder names should be consistent across layers (e.g., `features/study` ↔ `server/modules/study` ↔ `shared/study`).

### 3. Transport Standard
We are deprecating Server Actions in favor of standard HTTP Route Handlers. This ensures:
- **Mobile Readiness**: A future native mobile app can use the same API without modification.
- **Extraction Ready**: The backend can be mechanically moved to a standalone service if needed.
- **Consistent Pattern**: One way to perform mutations across the entire app.

## Consequences
- **Increased Boilerplate**: Moving from Server Actions to API routes requires creating a `route.ts` and a feature `api/` client for each mutation.
- **Better Type Safety**: API contracts are explicitly defined in `src/shared/` and validated at the boundary.
- **Architectural Clarity**: It is visually and mechanically obvious where code belongs based on its directory.
- **Future-Proofing**: The application is now prepared for multi-client support and potential backend extraction.
