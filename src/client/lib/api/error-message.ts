import type { ErrorCode, ErrorReason } from "@/shared/api-error";
import { isApiError } from "@/client/lib/api/fetch-json";

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
  "vocabulary.duplicate": "Từ này với nghĩa này đã có trong kho từ.",
  "vocabulary_set.not_found": "Không tìm thấy bộ từ.",
  "vocabulary_set.name_taken": "Đã có bộ từ mang tên này.",
  "plan.pro_required": "Tính năng này chỉ dành cho gói Pro.",
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
