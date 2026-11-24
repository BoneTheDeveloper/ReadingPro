import type { ErrorCode, ErrorReason } from "@/shared/api-error";
import { isApiError } from "@/client/lib/api/fetch-json";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  type CredentialErrorKey,
} from "@/shared/auth/credential-rules";

/** Failures the browser catches before sending a request. */
type ClientErrorReason =
  | "text.too_short"
  | "text.too_long"
  | "text.empty"
  | "file.too_large"
  | "file.invalid_type"
  | "file.empty"
  | "file.corrupt"
  | "file.filename_too_long"
  | "file.invalid_filename"
  | "file.invalid"
  | "upload.failed";

export type ErrorMessageKey = ErrorReason | ClientErrorReason;

// Every user-facing error string lives in this file; components and the server
// pass keys, never text. Vietnamese is the only locale for now: when an i18n
// library arrives, these two tables become its catalog and the keys stay.

/** Fallback per category, for responses whose reason this client does not know. */
const CODE_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  CONFLICT: "Dữ liệu đã thay đổi. Vui lòng tải lại trang.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  INTERNAL: "Đã có lỗi xảy ra. Vui lòng thử lại.",
};

const MESSAGES: Record<ErrorMessageKey, string> = {
  "request.invalid": CODE_MESSAGES.VALIDATION,
  "route.not_found": CODE_MESSAGES.NOT_FOUND,
  "auth.required": CODE_MESSAGES.UNAUTHORIZED,
  "internal": CODE_MESSAGES.INTERNAL,
  "passage.not_found": "Không tìm thấy bài đọc.",
  "passage.not_ready": "Bài đọc chưa xử lý xong. Vui lòng thử lại sau.",
  "artifact.not_found": "Không tìm thấy nội dung học tập.",
  "vocabulary.not_found": "Không tìm thấy từ vựng.",
  "dictionary.not_found": "Không có trong từ điển.",
  "word_lookup.not_found": "Không tìm thấy lượt tra từ này.",
  "vocabulary.duplicate": "Từ này với nghĩa này đã có trong kho từ.",
  "vocabulary_set.not_found": "Không tìm thấy bộ từ.",
  "vocabulary_set.name_taken": "Đã có bộ từ mang tên này.",
  "vocabulary_set.default_protected": "Không thể xóa bộ từ mặc định.",
  "plan.pro_required": "Tính năng này chỉ dành cho gói Pro.",
  "plan.quota_exceeded": "Bạn đã dùng hết lượt của gói trong kỳ này. Nâng cấp Pro hoặc chờ kỳ mới.",
  "payment.order_not_found": "Không tìm thấy đơn thanh toán.",
  "payment.webhook_unauthorized": CODE_MESSAGES.UNAUTHORIZED,
  "payment.not_configured": "Thanh toán tạm thời chưa sẵn sàng. Vui lòng thử lại sau.",
  "review.session_not_found": "Không tìm thấy phiên ôn tập.",
  "review.session_ended": "Phiên ôn tập đã kết thúc.",
  "youtube.url_invalid": "YouTube URL không hợp lệ",
  "youtube.no_transcript": "Video không có phụ đề",
  "chat.invalid_request": "Yêu cầu không hợp lệ. Hãy chọn bài đọc và nhập tin nhắn.",
  "text.too_short": "Văn bản quá ngắn tối.",
  "text.too_long": "Văn bản quá dài.",
  "text.empty": "Văn bản trống.",
  "file.too_large": "File vượt quá giới hạn 10MB.",
  "file.invalid_type": "Chỉ hỗ trợ file PDF và văn bản thuần.",
  "file.empty": "File rỗng, vui lòng chọn file khác.",
  "file.corrupt": "Nội dung file không khớp với phần mở rộng.",
  "file.filename_too_long": "Tên file vượt quá 100 kí tự.",
  "file.invalid_filename": "Tên file không hợp lệ.",
  "file.invalid": "File không hợp lệ, vui lòng thử lại.",
  "upload.failed": "Tải lên thất bại",
};

/** Better Auth error codes the sign-in, sign-up and OTP screens can receive. */
const AUTH_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email hoặc mật khẩu không đúng.",
  INVALID_USERNAME_OR_PASSWORD: "Tên đăng nhập hoặc mật khẩu không đúng.",
  EMAIL_NOT_VERIFIED: "Email chưa được xác thực.",
  USER_ALREADY_EXISTS: "Email này đã được đăng ký.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Email này đã được đăng ký.",
  USERNAME_IS_ALREADY_TAKEN: "Tên đăng nhập đã có người dùng.",
  USERNAME_TOO_SHORT: `Tên đăng nhập phải có ít nhất ${USERNAME_MIN_LENGTH} ký tự.`,
  USERNAME_TOO_LONG: `Tên đăng nhập tối đa ${USERNAME_MAX_LENGTH} ký tự.`,
  INVALID_USERNAME: "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu _ và dấu .",
  INVALID_EMAIL: "Email không hợp lệ.",
  PASSWORD_TOO_SHORT: `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
  PASSWORD_TOO_LONG: `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`,
  PASSWORD_NO_DIGIT: "Mật khẩu phải có ít nhất 1 chữ số.",
  INVALID_OTP: "Mã OTP không đúng.",
  OTP_EXPIRED: "Mã OTP đã hết hạn. Hãy gửi lại mã mới.",
  TOO_MANY_ATTEMPTS: "Nhập sai quá nhiều lần. Hãy gửi lại mã mới.",
};

/** Per-field checks on the auth forms (src/shared/auth/credential-rules.ts). */
const CREDENTIAL_MESSAGES: Record<CredentialErrorKey, string> = {
  "username.required": "Vui lòng nhập tên đăng nhập.",
  "username.too_short": AUTH_MESSAGES.USERNAME_TOO_SHORT,
  "username.too_long": AUTH_MESSAGES.USERNAME_TOO_LONG,
  "username.invalid": AUTH_MESSAGES.INVALID_USERNAME,
  "email.required": "Vui lòng nhập email.",
  "email.invalid": AUTH_MESSAGES.INVALID_EMAIL,
  "password.required": "Vui lòng nhập mật khẩu.",
  "password.too_short": AUTH_MESSAGES.PASSWORD_TOO_SHORT,
  "password.too_long": AUTH_MESSAGES.PASSWORD_TOO_LONG,
  "password.no_digit": AUTH_MESSAGES.PASSWORD_NO_DIGIT,
  "confirmPassword.required": "Vui lòng nhập lại mật khẩu.",
  "confirmPassword.mismatch": "Hai mật khẩu không khớp.",
  "identifier.required": "Vui lòng nhập tên đăng nhập hoặc email.",
};

export function credentialErrorText(key: CredentialErrorKey | undefined): string | undefined {
  return key && CREDENTIAL_MESSAGES[key];
}

/** Shown under the password field on sign-up, so the rule is visible before any error. */
export const PASSWORD_HINT = `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự và có 1 chữ số.`;

/** Client-side checks on the auth forms, before any request is sent. */
export const AUTH_FORM_MESSAGES = {
  otpIncomplete: "Hãy nhập đủ 6 chữ số.",
  usernameUnverified: "Email của tài khoản chưa được xác thực. Hãy đăng nhập bằng email để nhận mã OTP.",
  otpSendFailed: "Không gửi được mã OTP. Vui lòng thử lại.",
  googleFailed: "Đăng nhập Google thất bại.",
} as const;

/** User-facing text for a Better Auth client error: by code, then rate limit, then generic. */
export function getAuthErrorMessage(error: { code?: string; status?: number } | null | undefined): string {
  if (error?.code && error.code in AUTH_MESSAGES) return AUTH_MESSAGES[error.code];
  if (error?.status === 429) return CODE_MESSAGES.RATE_LIMITED;
  return CODE_MESSAGES.INTERNAL;
}

export function errorText(key: ErrorMessageKey): string {
  return MESSAGES[key];
}

/** User-facing text for any thrown value: by reason, then by category, then generic. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.reason && error.reason in MESSAGES) return MESSAGES[error.reason as ErrorMessageKey];
    if (error.code in CODE_MESSAGES) return CODE_MESSAGES[error.code as ErrorCode];
  }
  return CODE_MESSAGES.INTERNAL;
}
