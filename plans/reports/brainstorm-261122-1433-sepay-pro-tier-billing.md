# Brainstorm: gói Free/Pro, thanh toán QR qua SePay, UI tài khoản kiểu SaaS

Ngày: 2026-11-22 · Trạng thái: chờ người dùng chốt các câu hỏi mở · Bước tiếp: `ak:plan`

## Hiện trạng (đã kiểm chứng trong repo)

- `"User"."tier" TEXT DEFAULT 'FREE'` có từ `db/migrations/V1__init.sql`, khai báo là `additionalFields.tier` trong `src/server/modules/auth/auth.ts` nên nằm trong session.
- Chỉ có một chỗ chặn theo gói: `generateVocabularySetForUser` so `user.tier !== PRO_TIER` (`src/server/modules/vocabulary/sets/vocabulary-set-service.ts:122`), ném `plan.pro_required` (đã có trong `src/shared/api-error.ts`).
- Session dùng `cookieCache` 5 phút (`strategy: "compact"`), nên một thay đổi `tier` sau khi thanh toán có thể trễ tới 5 phút nếu vẫn đọc gói từ session.
- Không có cơ chế nào hạ gói khi hết hạn, cũng không có bảng thanh toán hay bảng đếm lượt dùng.
- `src/client/routes/account.tsx` chỉ là giao diện tĩnh: các ô tên, mật khẩu và nút xóa tài khoản chưa gọi API nào.
- Các điểm tốn chi phí AI: tạo passage (workflow), tạo artifact câu hỏi/flashcard, chat, dịch inline, tạo bộ từ tự động.
- API là Hono trên Nitro, deploy Vercel serverless (`sin1`). Webhook phải là HTTPS công khai; khi phát triển local cần tunnel. CSP `img-src` hiện chưa cho phép ảnh QR từ `vietqr.app`.

## Contract

**Outcome**
1. Hai gói Free và Pro có ma trận quyền lợi rõ ràng. Server chặn theo gói và theo hạn mức, client hiển thị đúng gói, lượt đã dùng và lời mời nâng cấp.
2. Người dùng chọn Pro theo tháng hoặc năm, quét VietQR ngay trong app, và được lên Pro tự động trong vài giây sau khi SePay gửi webhook. Trang thanh toán tự chuyển sang trạng thái thành công.
3. Khu vực tài khoản theo chuẩn SaaS: Hồ sơ, Bảo mật và Gói & thanh toán đều chạy thật; có trang Bảng giá công khai.

**Constraints**
- Theo lớp sẵn có: `*-routes.ts` → `*-service.ts` → `*-repository.ts` (chỉ repository chứa SQL), schema dùng chung đặt trong `src/shared/`.
- Schema thêm bằng Flyway `V3__...sql`, sao lưu DB trước khi migrate. Enum mới phải đồng bộ với `src/shared/enums.ts` (có test kiểm tra).
- Server chỉ trả error reason; client tự dịch thông báo.
- Số tiền là số nguyên VND. Kỳ hạn mức tính theo `"User"."timezone"`.
- SePay chưa hỗ trợ thanh toán định kỳ (recurring), nên Pro là gói trả trước theo thời hạn và gia hạn thủ công.
- Chạy trên Vercel serverless: không dùng kết nối dài, trạng thái thanh toán lấy bằng polling.

**Non-goals**
- Tự động gia hạn hoặc trừ tiền định kỳ; thanh toán thẻ; hoàn tiền tự động; hóa đơn VAT điện tử.
- Mã giảm giá, gói nhóm hoặc nhiều chỗ ngồi, trang quản trị (admin).
- Email nhắc gia hạn và cron đối soát qua SePay API. Thay vào đó dựa vào cơ chế retry của SePay (khoảng 33 phút) và nút Replay trên dashboard.

**Acceptance criteria**
1. Người dùng Free vượt hạn mức nhận `plan.quota_exceeded` (kèm `metric`, `limit`, `resetsAt`) và thấy hộp thoại nâng cấp. Người dùng Pro không bị chặn dưới mức fair-use.
2. `POST /api/billing/checkout` trả mã thanh toán duy nhất, số tiền và URL QR. Gọi lại khi còn đơn đang chờ cho cùng kỳ hạn thì trả lại đúng đơn đó.
3. Webhook có chữ ký hợp lệ, đúng mã và đủ tiền: đơn chuyển `PAID`, `proExpiresAt` cộng đúng một kỳ (nối tiếp thời gian còn lại), trang checkout chuyển sang thành công trong khoảng 5 giây mà không cần tải lại.
4. Gửi lại cùng một `id` giao dịch: vẫn trả 200 `{"success": true}` và không cộng thêm thời hạn.
5. Sai hoặc thiếu chữ ký, hay timestamp lệch quá 5 phút: trả 401 và DB không thay đổi.
6. Chuyển thiếu tiền hoặc mã không khớp đơn nào: giao dịch được ghi lại kèm `outcome`, không cấp Pro.
7. Khi `proExpiresAt` đã qua, server coi người dùng là Free mà không cần job nào chạy.
8. Trang Hồ sơ, Bảo mật và Gói & thanh toán đều thao tác thật được.
9. `pnpm test`, `pnpm typecheck` và `pnpm lint` đều xanh, có integration test cho webhook và hạn mức.
10. Chạy end-to-end một lần với giao dịch giả lập ở SePay Test mode, trỏ vào URL đã deploy hoặc URL tunnel.

## Giá (đã chốt cơ chế)

Có gói tháng và gói năm; giá năm bằng 11 tháng. Nếu tháng là 49.000đ thì năm là 539.000đ. Giá tháng chưa chốt.

## Phân gói và cách giới hạn (vòng 2)

Nguyên tắc: chỉ giới hạn những gì tốn tiền, tức các lệnh gọi AI. Vòng học cốt lõi (đọc, lưu từ, ôn FSRS) để Free dùng không giới hạn, để người dùng thấy giá trị trước khi trả tiền.

| Chức năng | Chi phí AI | Loại giới hạn | Free | Pro | Chặn tại |
|---|---|---|---|---|---|
| Nhập passage (Text/PDF/YouTube) | Cao nhất (cả bài đi qua model để viết lại) | Đếm theo tháng | 10 / tháng | 200 / tháng | `submitPassageForUser` |
| Độ dài passage | Tỉ lệ với chi phí nhập | Giới hạn đầu vào | 15.000 ký tự | 100.000 ký tự (mức hiện tại) | `submitPassageForUser` + form upload |
| Tạo câu hỏi / flashcard | Trung bình | Đếm theo tháng | 20 / tháng | 300 / tháng | `requestArtifactForUser` |
| Chat AI | Trung bình, tăng theo độ dài hội thoại | Đếm theo ngày | 20 tin / ngày | 200 tin / ngày | `streamStudyChatForUser` |
| Dịch inline | Rất thấp | Đếm theo ngày | 50 / ngày | Hợp lý (1.000 / ngày) | translate route |
| Bộ từ tự tạo (không tính bộ mặc định) | Không | Đếm số dòng đang lưu | 3 | Không giới hạn | `createVocabularySetForUser` |
| Tạo bộ từ tự động | Không | Chỉ Pro | Không | Có (đã có sẵn) | `generateVocabularySetForUser` |
| Đọc, lưu từ, ôn FSRS | Không | Không giới hạn | Có | Có | |

So với vòng 1: bỏ "15 passage lưu trữ" và thay bằng "10 passage mới mỗi tháng", vì chi phí nằm ở lúc xử lý chứ không nằm ở chỗ lưu trữ.

Lỗ hổng đã phát hiện: `src/server/modules/translate/translate-routes.ts` không có `requireSession`, nên ai cũng gọi được `/api/translate` và dùng AI miễn phí. Bắt buộc sửa trước khi giới hạn được lượt dịch.

### Ứng viên tính năng riêng cho Pro
| Đề xuất | Hiện trạng | Công sức |
|---|---|---|
| Passage dài tới 100.000 ký tự | Đã có (chỉ là hạn mức) | Thấp |
| Tạo bộ từ tự động | Đã có | Không |
| Chat dùng model mạnh hơn | Chưa có; chỉ đổi model theo gói | Thấp (tăng chi phí mỗi tin Pro) |
| Xuất từ vựng CSV / Anki | Chưa có | Trung bình |
| FSRS tối ưu tham số cá nhân | Cột `fsrsParams` có sẵn và scheduler đã đọc; chưa có optimizer | Cao |

### Cơ chế thực thi
- Bốn loại giới hạn, đều nằm trong `src/server/modules/billing/`. Hạn mức khai báo trong `src/shared/billing/plans.ts`:
  1. Chỉ Pro: `requirePro` ném `plan.pro_required`.
  2. Đếm theo kỳ: `consumeUsage(userId, metric)`, một câu SQL vừa kiểm tra vừa tăng. Không có dòng trả về nghĩa là đã hết lượt, ném `plan.quota_exceeded {metric, limit, used, resetsAt}`.
     ```sql
     INSERT INTO "UsageCounter" ("userId","metric","periodKey","count") VALUES ($1,$2,$3,1)
     ON CONFLICT ("userId","metric","periodKey")
     DO UPDATE SET "count" = "UsageCounter"."count" + 1 WHERE "UsageCounter"."count" < $4
     RETURNING "count";
     ```
  3. Đếm số dòng đang lưu: `COUNT` bên trong transaction có `lockUser` (hàm đã có), để hai request song song không cùng vượt giới hạn.
  4. Giới hạn đầu vào: so độ dài với hạn mức của gói.
- `periodKey` lấy theo múi giờ người dùng: `YYYY-MM-DD` cho kỳ ngày, `YYYY-MM` cho kỳ tháng (tháng dương lịch).
- Thứ tự trong service: kiểm tra những gì rẻ trước (passage sẵn sàng, YouTube có transcript), rồi mới trừ lượt, rồi mới gọi AI. Nhờ vậy request lỗi không làm mất lượt.
- Hoàn lượt khi job nhập passage hoặc tạo artifact bị FAILED (hoàn vào kỳ tính theo `createdAt`). Chat lỗi giữa chừng thì không hoàn.
- Nâng cấp giữa kỳ: dùng tiếp bộ đếm cũ với hạn mức Pro, có hiệu lực ngay.
- Hết Pro thì hạ gói mềm: dữ liệu cũ giữ nguyên và vẫn đọc được, chỉ chặn việc tạo mới khi vượt hạn mức.
- Hạn mức của Pro hiển thị là "Không giới hạn (sử dụng hợp lý)" và có chú thích con số cụ thể.
- Client: `GET /api/billing/summary` trả số đã dùng và hạn mức. Nút "Còn x/y" bị vô hiệu hóa khi hết lượt. Lỗi 403 mở `UpgradeDialog`. Server là nơi quyết định; kiểm tra ở client chỉ để trải nghiệm tốt hơn.
- Lưu ý chi phí: chat gửi lại toàn bộ lịch sử mỗi tin, nên đếm theo tin chưa giới hạn được chi phí của các cuộc chat dài. Có thể cắt lịch sử còn N tin gần nhất (cần chốt).

## So sánh cách tích hợp SePay

| | A. VietQR tự sinh + webhook giao dịch (khuyến nghị) | B. Payment Gateway (hosted checkout) + IPN | C. VA riêng cho từng đơn (Order VA) |
|---|---|---|---|
| Cách hoạt động | Server tạo đơn và mã `RPxxxxxxxx`, ảnh QR lấy từ `vietqr.app/img` với số tiền và nội dung điền sẵn. SePay báo giao dịch tiền vào qua webhook. | Gửi form có chữ ký sang trang SePay; SePay báo IPN. | SePay API cấp số VA riêng cho mỗi đơn. |
| Giả định chịu lực nhất | Nội dung chuyển khoản giữ nguyên mã thanh toán. | Tài khoản merchant được duyệt cổng thanh toán. | Tài khoản doanh nghiệp ở BIDV, VCB, VietinBank hoặc Sacombank. |
| Hỏng đầu tiên khi | Người dùng sửa nội dung hoặc ngân hàng cắt mã. Giao dịch rơi vào `NO_ORDER` và phải xử lý tay. | Chưa được duyệt; người dùng bị đưa ra khỏi app, không quét QR tại chỗ. | Tài khoản cá nhân ở ngân hàng không hỗ trợ: không dùng được. |
| Kích hoạt | Khoảng 30 phút, dùng được tài khoản cá nhân. | QR khoảng 30 phút, thẻ mất 3-5 ngày đến 2 tuần. | Phụ thuộc ngân hàng. |

Chọn A vì đúng luồng "quét QR ngay trong app" mà người dùng đã chọn, chạy được với tài khoản cá nhân, và ít thành phần nhất. Rủi ro sửa nội dung được giảm nhờ QR điền sẵn (phần lớn app ngân hàng khóa ô nội dung), nút sao chép, và bảng ghi giao dịch không khớp.

Better approaches: không có. Hướng khuyến nghị chính là hướng người dùng yêu cầu (nguồn: tài liệu SePay trong skill payment-integration, xác minh ngày 2026-09-26).

## Trade-offs của các quyết định thiết kế

- **Gói lấy từ `proExpiresAt` hay giữ cột `tier`.** Khuyến nghị lấy từ `proExpiresAt`: `isPro = proExpiresAt > now()`, đọc thẳng từ DB khi chặn quyền. Cách này tự hạ gói khi hết hạn và không bị trễ do cookie cache. Đổi lại, phải bỏ `tier` khỏi `additionalFields` và session, sửa chỗ chặn ở vocabulary-set, test helper và `auth.test.ts`, và client chuyển sang đọc `GET /api/billing/summary`. Phương án giữ cột `tier` phụ thuộc vào cron hạ gói và thất bại ngay khi cron không chạy.
- **Đếm hạn mức bằng bảng `UsageCounter` hay đếm từ các dòng đã có.** Khuyến nghị dùng bảng `UsageCounter(userId, metric, periodKey, count)` với một câu `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit RETURNING`, vừa kiểm tra vừa tăng trong một bước nên không bị race. Đếm từ dòng có sẵn sẽ hỏng khi người dùng xóa passage, vì xóa cascade làm mất artifact và chat, tức là "hồi" lại lượt. Riêng số passage lưu trữ thì đếm `COUNT` là đúng, vì đó là giới hạn dung lượng chứ không phải lượt dùng.
- **Cập nhật trạng thái thanh toán bằng polling hay SSE.** Chọn polling 3 giây (TanStack `refetchInterval`) và dừng khi đơn `PAID` hoặc đã hết hạn. SSE trên serverless tốn kết nối và dễ bị cắt.

## Thiết kế luồng

### Dữ liệu (V3)
- Thêm `"User"."proExpiresAt" TIMESTAMPTZ(3)`. Ánh xạ người dùng `tier='PRO'` hiện có (nếu có) rồi bỏ cột `tier`.
- `PaymentOrder`: `id`, `userId`, `code` (UNIQUE), `period` (MONTHLY/YEARLY), `amount`, `status` (PENDING/PAID/CANCELLED), `createdAt`, `expiresAt` (QR hết hạn sau 15 phút, trạng thái hết hạn tính từ cột này), `paidAt`, `sepayTransactionId`, `grantedUntil`.
- `SepayTransaction`: `sepayId BIGINT PRIMARY KEY` (dùng để chống trùng), `payload JSONB` (bản gốc), `code`, `amount`, `accountNumber`, `transactionDate`, `receivedAt`, `outcome` (MATCHED / NO_ORDER / AMOUNT_MISMATCH / ALREADY_PAID / IGNORED), `orderId`.
- `UsageCounter` như mô tả ở phần trade-offs.

### API (module `src/server/modules/billing/`)
- `GET /api/billing/summary`: gói, `proExpiresAt`, lượt đã dùng so với hạn mức, đơn đang chờ.
- `POST /api/billing/checkout {period}`: tạo đơn mới hoặc trả lại đơn đang chờ.
- `GET /api/billing/orders/:id`: trạng thái đơn, client polling endpoint này.
- `POST /api/billing/orders/:id/cancel`
- `GET /api/billing/orders`: lịch sử thanh toán.
- `POST /api/billing/sepay/webhook`: công khai, không qua `requireSession`, xác thực bằng HMAC.

### Webhook (xử lý đồng bộ, dưới 30 giây)
1. Đọc raw body bằng `c.req.text()`. Kiểm tra `X-SePay-Timestamp` lệch không quá 300 giây, rồi so `X-SePay-Signature` với `sha256=hex(HMAC(secret, "{ts}.{body}"))` bằng `timingSafeEqual`. Sai thì trả 401.
2. Chèn vào `SepayTransaction` với `ON CONFLICT DO NOTHING`. Nếu bản ghi đã tồn tại thì trả 200 `{"success":true}` ngay.
3. Bỏ qua giao dịch có `transferType != in` hoặc `accountNumber` khác tài khoản đã cấu hình (outcome `IGNORED`).
4. Tìm đơn theo `code` (fallback: regex `RP[A-Z0-9]{8}` trên `content`). Trong một transaction, khóa đơn bằng `FOR UPDATE`:
   - Đơn `PENDING`, kể cả đã quá hạn QR (tiền đã về thì vẫn ghi nhận), và `amount >= order.amount`: chuyển `PAID`, đặt `proExpiresAt = GREATEST(now, proExpiresAt) + kỳ hạn`.
   - Thiếu tiền: `AMOUNT_MISMATCH`. Đơn đã trả: `ALREADY_PAID`. Không tìm thấy: `NO_ORDER`. Các trường hợp này ghi log và xử lý tay.
5. Luôn trả 200 `{"success":true}` cho request đã hợp lệ, để SePay không retry vô ích.

### Cấu hình
- Biến môi trường: `SEPAY_WEBHOOK_SECRET`, `SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_CODE`, `SEPAY_ACCOUNT_HOLDER`, `PAYMENT_CODE_PREFIX=RP`.
- Trên dashboard SePay: Payment code structure đặt tiền tố `RP`; webhook chọn "Money in", bảo mật HMAC-SHA256, bật auto retry.
- CSP: thêm `https://vietqr.app` vào `img-src`.
- Nếu dùng VietinBank cá nhân, nội dung chuyển khoản phải chứa `SEVQR`.

## UI

- `/pricing` (công khai, có link từ trang marketing): hai thẻ gói, nút chuyển Tháng/Năm, bảng so sánh, FAQ (không tự gia hạn, thời gian kích hoạt, liên hệ khi chuyển sai).
- `/account` có sub-nav (cột trái trên desktop, tab trên mobile):
  - **Hồ sơ**: đổi tên qua `authClient.updateUser`; email chỉ đọc; avatar.
  - **Bảo mật**: đổi mật khẩu qua `changePassword`. Người dùng chỉ đăng nhập Google được dẫn sang luồng đặt mật khẩu bằng OTP có sẵn. Có danh sách phiên đăng nhập kèm nút thu hồi, và Xóa tài khoản qua `deleteUser` có bước xác nhận.
  - **Gói & thanh toán**: thẻ gói hiện tại (badge, ngày hết hạn, số ngày còn lại, nút Nâng cấp hoặc Gia hạn), thanh tiến độ lượt dùng, banner "đơn đang chờ" để tiếp tục thanh toán, bảng lịch sử (ngày, gói, số tiền, mã, trạng thái).
- `/billing/checkout/:orderId`: ảnh QR (template `compact`), ngân hàng, số tài khoản, chủ tài khoản, số tiền và nội dung, mỗi mục có nút sao chép. Có đồng hồ đếm ngược, trạng thái cập nhật trực tiếp, nút Hủy đơn, và màn hình thành công.
- Toàn cục: badge Pro cạnh avatar; menu avatar có mục "Gói & thanh toán"; `UpgradeDialog` bật lên khi nhận `plan.pro_required` hoặc `plan.quota_exceeded`; tính năng Pro hiện biểu tượng khóa; banner nhắc gia hạn khi còn từ 7 ngày trở xuống (tính từ dữ liệu, không cần cron).

## Rủi ro chưa giải quyết
- Kiểm thử local cần tunnel, vì SePay từ chối URL localhost. Integration test sẽ ký payload giả và gọi thẳng vào `app.request`.
- Mỗi giao dịch không khớp phải xử lý tay, và chưa có màn hình admin cho việc này.

## Câu hỏi mở
1. Giá tháng (đề xuất 49.000đ, năm 539.000đ) và các con số trong bảng hạn mức: chốt hay chỉnh?
5. Chọn tính năng riêng cho Pro trong danh sách ứng viên.
6. Có giới hạn YouTube/PDF chỉ cho Pro, hoặc giới hạn số từ đã lưu của Free không? (đề xuất: không)
7. Có cắt lịch sử chat còn N tin gần nhất không?
2. Đã có tài khoản SePay liên kết ngân hàng chưa, và là ngân hàng nào? (OCB, MSB, KienLongBank và BIDV cá nhân bắt buộc VA; VietinBank cá nhân cần `SEVQR`.)
3. Có đồng ý bỏ cột `tier` để lấy gói từ `proExpiresAt` không? Thay đổi này ảnh hưởng tới session contract.
4. Phạm vi trang tài khoản: làm thật cả Hồ sơ, Bảo mật (đổi mật khẩu, phiên đăng nhập, xóa tài khoản) cùng với Gói & thanh toán, hay chỉ làm phần thanh toán?
