# Phase 4: API Route Tests

## Goal

Test route handlers as callable units using shared request/response helpers and mocked external boundaries.

## Target Files

- `src/app/api/cards/due/route.ts`
- `src/app/api/cards/review/route.ts`
- `src/app/api/progress/stats/route.ts`
- `src/app/api/study-session/route.ts`
- `src/app/api/study-chat/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/upload/text/route.ts`

## Work Items

1. Test authenticated success paths for due cards, card review update, progress stats, study session create/update, study chat, file upload, and text upload.
2. Test unauthenticated paths by mocking auth helper failures and asserting response status/payload.
3. Test validation and malformed body paths: missing IDs, invalid ratings, invalid JSON, invalid text, invalid files, and absent form fields.
4. Test dependency failures: DB/service errors, AI stream errors, storage/upload errors, and ensure stable API error payloads.
5. Test Sentry capture/logging behavior for routes that catch unexpected exceptions.
6. For JSON routes, assert response status and use `await response.json()` or `readJsonResponse` with `expectApiSuccessPayload` / `expectApiErrorPayload`.
7. For the streaming `study-chat` success path, assert `response instanceof Response`, assert the `streamText` mock was called, and assert the prompt/messages include the selected passage context; do not use `readJsonResponse` for this success path.

## Verification

- Route tests avoid a running Next server.
- Response status codes and JSON payload shapes are asserted for JSON happy and error paths.
- The streaming chat success path is asserted as a stream response with `streamText` context assertions.
- `pnpm test` passes after phase completion.
