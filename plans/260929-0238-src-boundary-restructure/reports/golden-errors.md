# Golden API responses: before and after Hono-native handlers

Captured on 2026-09-29 against `pnpm dev:api` without a session cookie, first at
the end of Phase 4 (old `withErrorHandling` wrapper) and then after Phase 5.
Authenticated paths need a Google session, so they are covered by the manual
smoke instead.

## Result

All unauthenticated routes return the same 401 body. Translate validation
errors return the same 400 `VALIDATION` body, including `details`. A forced
service failure returns the same 500 `INTERNAL` body. Unknown routes still return
Hono's plain 404.

Three responses differ, all for bodies the app's client never sends:

| Request | Before | After |
|---|---|---|
| `POST /api/translate` with an empty body | 500 `INTERNAL` | 400 `VALIDATION` (issues for the missing fields) |
| `POST /api/translate` with malformed JSON | 500 `INTERNAL` | 400 `VALIDATION`, "Malformed JSON in request body" |
| `POST /api/translate` with a JSON body sent as `text/plain` | body parsed | body ignored; 400 `VALIDATION` for missing fields |

`zValidator` only reads JSON when `Content-Type` is `application/json`. Every
client mutation and the AI SDK chat transport send that header.

## Before (end of Phase 4)

```
GET /passage  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /passage body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /passage/not-a-uuid  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /passage/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /passage/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /artifact  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /artifact?passageId=x  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /artifact/flashcard body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /artifact/question body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /artifact/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /artifact/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
PATCH /artifact/00000000-0000-4000-8000-000000000000/progress body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /vocabulary  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /vocabulary body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /vocabulary/stats  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
PATCH /vocabulary/00000000-0000-4000-8000-000000000000 body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /vocabulary/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /ai-chat  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /ai-chat body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /ai-chat  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /translate body={} -> 400 {"error":{"code":"VALIDATION","message":"Invalid input: expected string, received undefined","details":[{"expected":"string","code":"invalid_type","path":["word"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":["context"],"message":"Invalid input: expected string, received undefined"}]}}
POST /translate body={"word":""} -> 400 {"error":{"code":"VALIDATION","message":"Too small: expected string to have >=1 characters","details":[{"origin":"string","code":"too_small","minimum":1,"inclusive":true,"path":["word"],"message":"Too small: expected string to have >=1 characters"},{"origin":"string","code":"invalid_format","format":"regex","pattern":"/^\\S+$/","path":["word"],"message":"Invalid string: must match pattern /^\\S+$/
POST /translate  -> 500 {"error":{"code":"INTERNAL","message":"Internal server error"}}
POST /translate body={bad -> 500 {"error":{"code":"INTERNAL","message":"Internal server error"}}
POST /translate body={"word":"x"} -> 400 {"error":{"code":"VALIDATION","message":"Invalid input: expected string, received undefined","details":[{"expected":"string","code":"invalid_type","path":["context"],"message":"Invalid input: expected string, received undefined"}]}}
GET /translate  -> 404 404 Not Found
GET /nope  -> 404 404 Not Found
GET /auth/get-session  -> 200 null
POST /translate (service throws) -> 500 {"error":{"code":"INTERNAL","message":"Internal server error"}}
```

## After (Phase 5)

```
GET /passage  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /passage body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /passage/not-a-uuid  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /passage/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /passage/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /artifact  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /artifact?passageId=x  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /artifact/flashcard body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /artifact/question body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /artifact/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /artifact/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
PATCH /artifact/00000000-0000-4000-8000-000000000000/progress body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /vocabulary  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /vocabulary body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /vocabulary/stats  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
PATCH /vocabulary/00000000-0000-4000-8000-000000000000 body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /vocabulary/00000000-0000-4000-8000-000000000000  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
GET /ai-chat  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /ai-chat body={} -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
DELETE /ai-chat  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
POST /translate body={} -> 400 {"error":{"code":"VALIDATION","message":"Invalid input: expected string, received undefined","details":[{"expected":"string","code":"invalid_type","path":["word"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":["context"],"message":"Invalid input: expected string, received undefined"}]}}
POST /translate body={"word":""} -> 400 {"error":{"code":"VALIDATION","message":"Too small: expected string to have >=1 characters","details":[{"origin":"string","code":"too_small","minimum":1,"inclusive":true,"path":["word"],"message":"Too small: expected string to have >=1 characters"},{"origin":"string","code":"invalid_format","format":"regex","pattern":"/^\\S+$/","path":["word"],"message":"Invalid string: must match pattern /^\\S+$/
POST /translate  -> 400 {"error":{"code":"VALIDATION","message":"Invalid input: expected string, received undefined","details":[{"expected":"string","code":"invalid_type","path":["word"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":["context"],"message":"Invalid input: expected string, received undefined"}]}}
POST /translate body={bad -> 400 {"error":{"code":"VALIDATION","message":"Malformed JSON in request body"}}
POST /translate body={"word":"x"} -> 400 {"error":{"code":"VALIDATION","message":"Invalid input: expected string, received undefined","details":[{"expected":"string","code":"invalid_type","path":["word"],"message":"Invalid input: expected string, received undefined"},{"expected":"string","code":"invalid_type","path":["context"],"message":"Invalid input: expected string, received undefined"}]}}
GET /translate  -> 404 404 Not Found
GET /nope  -> 404 404 Not Found
GET /auth/get-session  -> 200 null
POST /translate (service throws) -> 500 {"error":{"code":"INTERNAL","message":"Internal server error"}}
```
