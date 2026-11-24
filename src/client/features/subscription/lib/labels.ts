import type { MeteredFeature, ProPlanCode, SubscriptionStatus } from "@/shared/plan/plans";

export const FEATURE_LABELS: Record<MeteredFeature, string> = {
  passage_import: "Nhập bài đọc",
  artifact_generate: "Tạo flashcard / câu hỏi",
  chat_message: "Tin nhắn chat với tutor",
  ai_meaning: "Nghĩa theo ngữ cảnh (AI)",
  set_generate: "Tạo bộ từ bằng AI",
};

export const PLAN_LABELS: Record<ProPlanCode, { name: string; cycle: string; note?: string }> = {
  PRO_MONTHLY: { name: "Pro 1 tháng", cycle: "/tháng" },
  PRO_YEARLY: { name: "Pro 12 tháng", cycle: "/năm", note: "Tiết kiệm 2 tháng" },
};

export const STATE_LABELS: Record<SubscriptionStatus["state"], string> = {
  none: "Gói Free",
  active: "Đang hoạt động",
  expiring: "Sắp hết hạn",
  expired: "Đã hết hạn",
  complimentary: "Pro được cấp",
};

export const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

export const formatDate = (date: Date) =>
  date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatDateTime = (date: Date) =>
  date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
