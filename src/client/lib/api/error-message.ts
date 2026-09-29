import type { ErrorCode } from "@/shared/contracts/api-error";
import { isApiError } from "@/client/lib/api/fetch-json";


const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  CONFLICT: "Dữ liệu đã thay đổi. Vui lòng tải lại trang.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  INTERNAL: "Đã có lỗi xảy ra. Vui lòng thử lại.",
};

export function getErrorMessage(error: unknown): string {
  if (isApiError(error) && error.code in MESSAGES) {
    return MESSAGES[error.code as ErrorCode];
  }
  return MESSAGES.INTERNAL;
}
