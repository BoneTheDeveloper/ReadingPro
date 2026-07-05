---
phase: 3
title: Chat History Action
status: completed
effort: ''
---

# Phase 3: Chat History Action

## Overview

Chuyển `GET /api/studio/chat` (lấy lịch sử chat, không AI) sang Server Action. GIỮ NGUYÊN `POST /api/studio/chat` (streaming, AI) — không đụng vào.

## Related Code Files
- Create/Modify: `features/studio-panel/actions.ts` (từ Phase 2) — thêm `getChatHistoryAction(passageId: string)`
- Modify: `features/studio-panel/ui/studio/chat/chat-panel.tsx` — `bootstrapMessages()` gọi action thay vì `fetch("/api/studio/chat?passageId=...")`
- Modify: `app/api/studio/chat/route.ts` — xoá export `GET`, giữ nguyên `POST`
- Check trước khi xoá: `studyChatHistoryResponseSchema` (`contracts/study/study-response-schema.ts`) — grep toàn repo, nếu chỉ còn dùng ở `chat-panel.tsx` (đang parse response JSON) thì không cần xoá schema (không bắt buộc, có thể vẫn dùng để validate trong action), nếu action trả object đã typed thì bỏ qua `safeParse` phía client

## Implementation Steps

1. Thêm `getChatHistoryAction(passageId: string)` vào `features/studio-panel/actions.ts`: gọi `getUserId()`, validate `passageId` bằng `z.string().uuid()`, gọi `getChatHistory(userId, passageId)` (từ `server/modules/ai-chat/chat-service.ts`), map kết quả sang shape UI cần: `messages.map(m => ({ id: m.id, role: m.role, parts: [{ type: "text", text: m.content }] }))` (y hệt logic đang nằm trong route GET hiện tại).
2. Sửa `chat-panel.tsx`: bỏ `Sentry.startSpan` bọc `fetch` GET + `studyChatHistoryResponseSchema.safeParse`, thay bằng `try { const messages = await getChatHistoryAction(passageId); setMessages(messages); } catch { setMessages([]); }` — giữ nguyên các `Sentry.addBreadcrumb`/`Sentry.captureException` hiện có để không mất observability.
3. Xoá `export async function GET` trong `app/api/studio/chat/route.ts`, giữ nguyên toàn bộ `POST`.
4. Grep `studyChatHistoryResponseSchema` — nếu không còn consumer nào khác ngoài `chat-panel.tsx` cũ (đã xoá usage ở bước 2), cân nhắc xoá luôn schema; nếu phân vân, để lại (không bắt buộc dọn, không phải success criteria).
5. Chạy `pnpm typecheck && pnpm lint`.

## Success Criteria

- [ ] `chat-panel.tsx` không còn `fetch` GET tới `/api/studio/chat`
- [ ] `app/api/studio/chat/route.ts` chỉ còn `POST` (streaming AI), không còn `GET`
- [ ] Lịch sử chat vẫn load đúng khi mount panel (kiểm tra bằng đọc lại logic, không thể smoke-test UI vì cần Clerk login — ghi rõ trong Known Gaps)
- [ ] `pnpm typecheck && pnpm lint` sạch

## Risk Assessment
Risk thấp — đây là GET thuần đọc DB, không có side-effect. Điểm cần cẩn thận: giữ đúng breadcrumb/Sentry tracking hiện có để không mất observability khi đổi cơ chế gọi.
