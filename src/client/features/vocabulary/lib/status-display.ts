import type { VocabularyStatus } from "@/shared/enums";

export const STATUS_LABEL: Record<VocabularyStatus | "ALL", string> = {
  ALL: "Tất cả",
  NEW: "Mới",
  LEARNING: "Đang học",
  REVIEW: "Đang ôn",
  RELEARNING: "Học lại",
};

export const STATUS_STYLE: Record<VocabularyStatus, { bg: string; color: string; dot: string }> = {
  NEW: { bg: "#FBEFD8", color: "#A66A12", dot: "#EEA63C" },
  LEARNING: { bg: "#ECEAFB", color: "#4A3FD0", dot: "#5A4FE0" },
  REVIEW: { bg: "#DDF3E7", color: "#1E7A4B", dot: "#2FA66A" },
  RELEARNING: { bg: "#FCE7E1", color: "#C8442B", dot: "#F2664A" },
};
