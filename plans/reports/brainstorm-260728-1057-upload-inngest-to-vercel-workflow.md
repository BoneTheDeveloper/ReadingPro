# Brainstorm: Upload pipeline — Inngest → Vercel Workflow + AI SDK file upload

Date: 2026-07-28 | Branch: main | Status: contract accepted, ready for planning

## Contract

**Outcome:** Pipeline upload chạy trên Vercel Workflow DevKit thay Inngest. PDF
được gửi thẳng cho provider qua AI SDK `uploadFile` thay vì extract text bằng
`unpdf`. Job không còn kẹt `PENDING` khi user đóng tab.

**Constraints:**
- Không đổi Prisma schema.
- Không đổi contract client: `jobId` + polling `UploadJob` qua `getUploadStatus`.
- Studio (`generate-questions`) **giữ nguyên Inngest** trong phase này.
- Deploy Vercel region `sin1`; phải chạy được `next dev` không cần dịch vụ ngoài.
- Giữ magic-byte validation (`validateFileContent`) trước khi gửi provider.

**Non-goals:**
- Không migrate studio/generate-questions.
- Không đổi UI, không đổi luồng cấp token blob (`onBeforeGenerateToken`).
- Không đổi prompt của cefr / vocabulary / topic.

**Acceptance:**
- `pnpm typecheck`, `pnpm lint`, `pnpm knip` sạch.
- TEXT / YOUTUBE / PDF đều tới `DONE` kèm `passageId`.
- Fail → `UploadJob.status = FAILED` + blob được dọn.
- Đóng tab ngay sau khi chọn file → job kết thúc `FAILED` (có timeout), không kẹt `PENDING`.

## Hiện trạng đã verify

**Build đang gãy trước khi migrate** — `pnpm typecheck` fail 5 lỗi:
- `src/features/upload/server/inngest/events.ts` không tồn tại nhưng được import
  ở `actions/upload.ts:9` và `actions/notify-upload-complete.ts:9`.
  `uploadProcessed` thực nằm inline trong `inngest/handle-upload-event.ts:29`.
- `inngest.send(eventType, { data })` sai signature với `inngest@4.13`.

Migration xoá luôn các import này → breakage tự hết.

**Luồng hiện tại:**

| File | Vai trò |
|---|---|
| `actions/prepare-upload.ts` | tạo `UploadJob` PENDING + `blobPath` |
| `app/api/upload/route.ts` | `handleUpload` cấp token; `onUploadCompleted` rỗng |
| `actions/notify-upload-complete.ts` | client gọi sau upload → `inngest.send` |
| `inngest/handle-upload-event.ts` | 5 `step.run` |
| `hooks/use-upload-submit.ts:52` | poll `getUploadStatus` đọc bảng `UploadJob` |

Client poll qua bảng `UploadJob`, **không** đọc trạng thái engine → đổi engine
không đụng client, không cần `getRun()` của Workflow.

**Lỗ hổng đã xác nhận:** `use-upload-submit.ts:180` gọi `notifyUploadComplete`
sau khi browser upload xong. Đóng tab giữa chừng → job kẹt `PENDING` vĩnh viễn +
blob mồ côi, không có cơ chế dọn.

## Quyết định

| # | Quyết định | Ghi chú |
|---|---|---|
| 1 | Phạm vi: chỉ upload; studio giữ Inngest | `inngest` + `workflow` cùng tồn tại tạm thời |
| 2 | Trigger: start workflow ngay ở `prepare-upload`, step `waitForBlob` poll bằng `RetryableError({ retryAfter: '5s' })`, `maxRetries = 60` | **Mặc định do mình chọn** — user chưa chốt rõ, cần xác nhận |
| 3 | Bỏ `unpdf`; gửi PDF thẳng provider qua `uploadFile({ api: openai.files() })` | User quyết; đổi từ Anthropic sang **OpenAI** |
| 4 | Cài `@workflow/ai` | User quyết, dù pipeline hiện chỉ là 3 call one-shot |

Quyết định 3 + 4 **đảo ngược một phần** quyết định trong
`plans/260727-1811-ai-gateway-migration/plan.md`: cần `@ai-sdk/openai` +
`OPENAI_API_KEY` quay lại vì gateway model string không có `.files()`.
Provider vẫn là OpenAI nên phần "OpenAI only" của plan đó được giữ.
User đã được cảnh báo và vẫn chọn.

### Vì sao `uploadFile` đáng dùng (lý do thật)

Chỉ **một** step cần file (step transcribe), nên lợi ích "upload 1 lần, N tham
chiếu" gần như không có. Lợi ích thật đến từ **step checkpointing của Workflow**:

```
step downloadBlob   → Buffer
step uploadToOpenAI → file-id      ← checkpoint
step transcribe     → content      ← retry KHÔNG upload lại 10MB
step analyze        → cefr/vocab/topics (chỉ cần content[:5000])
```

Không có file-id được checkpoint thì mỗi lần retry step transcribe là gửi lại
toàn bộ 10MB. Đây là synergy giữa quyết định 2 và 3.

## API đã verify

- `workflow`: `"use workflow"` / `"use step"`, `start()` từ `workflow/api`,
  `FatalError`, `RetryableError({ retryAfter })` + `fn.maxRetries`,
  `createHook({ token })` + `resumeHook(token, data)`,
  `withWorkflow` trong `next.config.ts`, `WORKFLOW_PUBLIC_MANIFEST=1` trong `vercel.json`.
- Local dev: `@workflow/world-local` (filesystem) là mặc định cho `next dev` —
  không cần Docker/Postgres, bỏ được `dev:inngest` cho phần upload.
- `ai`: `uploadFile({ api, data, mediaType, filename, providerOptions })` →
  `{ providerReference }`. `data` của `uploadFile` **chỉ nhận bytes, không nhận URL**
  → vẫn phải `downloadFile()` từ blob.
- `openai.files()` **bắt buộc** `providerOptions: { openai: { purpose } }`
  (type `OpenAIFilesOptions` từ `@ai-sdk/openai`). Docs ví dụ dùng `'assistants'`;
  `'user_data'` có thể mới đúng cho Responses API → spike xác nhận.
- Message part: `{ type: 'file', mediaType: 'application/pdf', data }` trong đó
  `data` nhận Buffer, **OpenAI file-id string**, hoặc **URL công khai**.
- PDF input đi qua **OpenAI Responses API**; mọi ví dụ PDF trong docs dùng
  `openai('gpt-5')`.

### Đã cân nhắc và loại

`data` nhận URL trực tiếp → nếu blob để `access: 'public'` thì bỏ được cả
`downloadFile` lẫn `uploadFile`. **Loại**: PDF của user sẽ đọc được bởi bất kỳ ai
có link. Không đáng đổi privacy lấy 1 bước.

## Rủi ro cần giải quyết khi plan

1. **Model chưa chốt.** `gpt-4-turbo` (user đề xuất) có trước Responses API PDF
   input; `gpt-4o-mini` (repo đang pin) cũng chưa xác nhận đọc được PDF. Docs
   dùng `gpt-5`. Chi phí transcribe PDF 10MB phụ thuộc trực tiếp lựa chọn này.
2. **`Passage.content` chuyển sang LLM sinh ra.** Đây là toàn văn người dùng sẽ
   đọc. Cần guard: giới hạn số trang / độ dài, và check
   `UPLOAD_CONFIG.MAX_TEXT_LENGTH = 100_000`. Rủi ro cắt xén / bịa nội dung.
3. **Chi phí & độ trễ** transcription PDF tối đa 10MB mỗi upload.
4. **`unpdf` bị xoá** → knip sẽ flag; `serverExternalPackages: ["pdf-parse"]`
   trong `next.config.ts` cũng thành thừa.
5. **3 dep runtime cùng lúc**: `inngest` (studio) + `workflow` + `@workflow/ai`.
6. `withWorkflow` phải compose được với `withSentryConfig` đang bọc `next.config.ts`.
7. **Chưa xác nhận `ai@^7.0.37` đã export `uploadFile`.** Không đọc được
   `node_modules` (hook chặn). Docs tham chiếu là `ai-sdk.dev` bản hiện tại.
   → kiểm tra ở bước spike; có thể phải nâng `ai`.

## Spike cần chạy trước khi plan chi tiết

Script ~30 dòng, một file PDF thật:
`downloadFile` → `uploadFile({ api: openai.files(), providerOptions.purpose })`
→ `generateText({ model, messages: [{ type:'file', data: providerReference }] })`.
Xác nhận: `uploadFile` tồn tại trong `ai` đã cài, `purpose` nào đúng, model nào
đọc được PDF, và chi phí/độ trễ thực tế trên PDF cỡ 1MB và 10MB.

## Câu hỏi chưa giải quyết

1. Trigger (quyết định 2) — user né 2 lần. **Chốt mặc định phương án A** trừ khi
   user phản đối.
2. Model cho bước transcribe PDF? (`gpt-5` / `gpt-4.1` / `gpt-4o`)
3. TEXT / YOUTUBE analyzers giữ model string qua gateway, hay đổi sang
   `openai(...)` adapter cho đồng nhất một đường?
4. Giới hạn số trang PDF để chặn chi phí?
5. `Passage.content` do LLM sinh — chấp nhận rủi ro cắt xén/bịa nội dung bài đọc?
