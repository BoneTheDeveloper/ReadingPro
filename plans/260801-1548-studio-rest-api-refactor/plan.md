# Plan: Studio Feature REST API Refactor

## Outcome
Refactor studio feature from server actions to REST API with fetch + useMutation following CLAUDE.md conventions.

## API Design

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/artifact?passageId=` | List artifacts for passage |
| GET | `/api/artifact/[id]` | Get artifact with content + type |
| POST | `/api/artifact/question` | Create question artifact |
| PATCH | `/api/artifact/[id]/progress` | Update progress |
| DELETE | `/api/artifact/[id]` | Delete artifact |

## Phases

1. **Phase 1:** API Routes - Create REST endpoints
2. **Phase 2:** Client Hooks - Refactor to fetch + useMutation
3. **Phase 3:** Cleanup - Remove deprecated actions

## Acceptance Criteria

- [ ] All artifact operations go through route handlers
- [ ] `GET /api/artifact/[id]` returns `{ id, passageId, type, content, progress, createdAt }`
- [ ] Client uses `useQuery`/`useMutation` with HTTP calls
- [ ] No `"use server"` in client code
- [ ] TypeScript compiles without errors
- [ ] Existing studio functionality preserved

## Status
- [x] Brainstorm contract
- [ ] Phase 1: API Routes
- [ ] Phase 2: Client Hooks  
- [ ] Phase 3: Cleanup
