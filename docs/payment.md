# Module Payment (Subscription Pro qua SePay)

Thanh toán gói Pro bằng chuyển khoản VietQR. SePay theo dõi tài khoản ngân hàng nhận tiền và gọi webhook của chúng ta cho mỗi giao dịch.

## Mã nguồn

| File | Vai trò |
|---|---|
| `src/shared/plan/plans.ts` | Gói (`PRO_PLANS`), quota theo tier, schema dùng chung |
| `src/server/modules/subscription/sepay-config.ts` | Đọc biến `SEPAY_*`, cấu hình dev, tạo URL ảnh VietQR |
| `src/server/modules/subscription/subscription-service.ts` | Checkout, xử lý webhook, entitlement, quota |
| `src/server/modules/subscription/subscription-repository.ts` | Truy vấn DB |
| `src/server/modules/subscription/subscription-routes.ts` | Route API và webhook |
| `db/migrations/V4__subscription_and_quota.sql` | Bảng subscription, payment order, giao dịch SePay, usage |
| `src/client/features/subscription/` | Trang checkout, query client |
| `scripts/sepay-mock-webhook.ts` | Giả lập webhook SePay khi chạy local |

## Gói

| Mã | Thời hạn | Giá |
|---|---|---|
| `PRO_MONTHLY` | 1 tháng | 49.000đ |
| `PRO_YEARLY` | 12 tháng | 490.000đ |

## Luồng thanh toán

1. Người dùng chọn gói ở `/pricing`. Client gọi `POST /api/subscription/checkout` với `{ planCode }`.
2. Server tạo payment order với mã `RPRO` + 8 ký tự, hạn hiển thị 30 phút. Nếu người dùng đã có đơn PENDING cho cùng gói thì server trả lại đơn đó.
3. Trang `/checkout/:orderId` hiện QR (`vietqr.app`) với số tiền và nội dung là mã thanh toán. Trang hỏi lại `GET /api/subscription/orders/:id` mỗi 3 giây khi đơn còn PENDING.
4. Người dùng chuyển khoản. SePay gọi `POST /api/webhooks/sepay` với header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`.
5. Server lưu giao dịch theo `id` của SePay, rồi trong cùng một transaction đánh dấu đơn PAID và cộng thêm tháng Pro. Phản hồi là `{ success: true, outcome }`, kể cả khi bị gửi lặp, để SePay ngừng retry.

## API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/subscription` | Tier, trạng thái (`active`, `expiring`, `complimentary`, `expired`, `none`), usage |
| GET | `/api/subscription/orders` | Lịch sử đơn đã thanh toán |
| POST | `/api/subscription/checkout` | Tạo hoặc tiếp tục checkout |
| GET | `/api/subscription/orders/:id` | Đơn kèm QR và thông tin ngân hàng |
| POST | `/api/webhooks/sepay` | Webhook công khai, xác thực bằng API key |

## Outcome của webhook

| Outcome | Khi nào |
|---|---|
| `MATCHED` | Tiền vào, tìm thấy đơn PENDING, số tiền đủ hoặc dư. Pro được cộng thêm. |
| `UNDERPAID` | Tìm thấy đơn nhưng số tiền thiếu. Đơn vẫn PENDING. |
| `NO_ORDER` | Không có mã hợp lệ, hoặc đơn đã PAID/REFUNDED. Giao dịch được lưu để hoàn tiền thủ công. |
| `IGNORED` | `transferType` khác `in`. |
| `DUPLICATE` | `id` giao dịch đã được xử lý. Không có thay đổi. |

Mã thanh toán được tìm trong trường `code` (SePay tự tách khi đã cấu hình tiền tố) và sau đó trong `content`.

## Biến môi trường

```
SEPAY_BANK_CODE=        # mã ngân hàng VietQR, ví dụ MB, VCB
SEPAY_BANK_ACCOUNT=     # số tài khoản SePay theo dõi
SEPAY_ACCOUNT_NAME=     # tên chủ tài khoản
SEPAY_WEBHOOK_API_KEY=  # key đặt trong cấu hình webhook SePay
```

Ngoài production, nếu các biến này để trống thì server dùng cấu hình dev với key `dev-sepay-key`. Trong production cả bốn biến là bắt buộc; thiếu biến nào thì API trả `payment.not_configured`.

## Test và demo

### Unit test

```bash
pnpm test src/server/modules/subscription
```

### Demo local với webhook giả

1. Để trống `SEPAY_*` trong `.env`.
2. Chạy `pnpm db:up`, `pnpm dev:api` (cổng 3001) và `pnpm dev:web`.
3. Đăng nhập, chọn gói ở `/pricing` và lấy mã `RPRO...` trên trang checkout.
4. Chạy `pnpm sepay:mock-webhook RPROXXXXXXXX 49000`. Kết quả mong đợi là `200 {"success":true,"outcome":"MATCHED"}`, và trang checkout chuyển sang đã thanh toán trong khoảng 3 giây.

Các trường hợp nên kiểm tra thêm:

| Thao tác | Kết quả mong đợi |
|---|---|
| `pnpm sepay:mock-webhook <mã> 10000` | `UNDERPAID` |
| Mã không tồn tại, ví dụ `RPROAAAAAAAA` | `NO_ORDER` |
| Gửi lại mã của đơn đã thanh toán | `NO_ORDER` |
| `SEPAY_WEBHOOK_API_KEY=sai pnpm sepay:mock-webhook <mã>` | Lỗi `payment.webhook_unauthorized` |
| Dùng `curl` gửi cùng một payload (cùng `id`) hai lần | Lần hai trả `DUPLICATE` |

Biến `SEPAY_MOCK_URL` cho phép trỏ script tới một URL khác, ví dụ server đã deploy.

## Việc cần làm khi deploy (TODO)

Chưa thực hiện. Làm sau khi có domain production.

- [ ] Tạo tài khoản SePay tại my.sepay.vn và liên kết tài khoản ngân hàng nhận tiền. Có thể dùng tài khoản demo của SePay để giả lập giao dịch trước khi dùng tiền thật.
- [ ] Trong cấu hình công ty, mục cấu trúc mã thanh toán, đặt tiền tố `RPRO`.
- [ ] Trong mục Tích hợp WebHooks, tạo webhook:
  - URL: `https://<domain>/api/webhooks/sepay`
  - Sự kiện: tiền vào
  - Chứng thực: API Key, dùng một key ngẫu nhiên đủ dài
  - Bật retry khi lỗi
- [ ] Đặt bốn biến `SEPAY_*` trên môi trường production.
- [ ] Kiểm tra end-to-end: tạo checkout, chuyển khoản thật hoặc giả lập trên SePay, rồi xác nhận nhật ký webhook trên SePay ghi HTTP 200 với `success: true`, outcome trong DB là `MATCHED` và tài khoản lên Pro.
- [ ] Trước khi có domain, có thể test với SePay thật bằng tunnel: `cloudflared tunnel --url http://localhost:3001` hoặc `ngrok http 3001`, rồi dùng URL tunnel cho webhook.

Tên menu trên giao diện SePay có thể đã thay đổi. Hãy kiểm tra lại với tài liệu hiện tại của SePay khi cấu hình.

## Giới hạn hiện tại

- Hoàn tiền mới chỉ được ghi nhận (`refundedAt`). Chưa có luồng hoàn tiền thật.
- Không có gia hạn tự động. Người dùng mua thêm thì thời hạn được cộng nối tiếp.
- Đơn quá 30 phút hiển thị là EXPIRED, nhưng nếu tiền đến muộn với đúng mã thì đơn vẫn được ghi nhận thanh toán.
