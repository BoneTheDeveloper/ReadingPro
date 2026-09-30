const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const formatDate = (date: Date | null) => (date ? DATE_FORMAT.format(date) : "—");
