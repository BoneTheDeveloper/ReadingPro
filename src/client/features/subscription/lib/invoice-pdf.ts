// Builds a payment's invoice as a PDF in the browser. Noto Sans is embedded
// from /fonts so Vietnamese text renders; pdf-lib loads only when asked.
import type { PaymentOrder } from "@/shared/plan/plans";
import { formatDate, formatDateTime, formatVnd, PLAN_LABELS } from "./labels";

type Buyer = { name?: string | null; email: string };

const fontBytes = (file: string) => fetch(`/fonts/${file}`).then((res) => res.arrayBuffer());

export async function downloadInvoicePdf(order: PaymentOrder, buyer: Buyer): Promise<void> {
  const [{ PDFDocument, rgb }, { default: fontkit }, regularBytes, boldBytes] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
    fontBytes("NotoSans-Regular.ttf"),
    fontBytes("NotoSans-Bold.ttf"),
  ]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  pdf.setTitle(`Hóa đơn ${order.paymentCode}`);
  pdf.setAuthor("ReadingPro");

  const page = pdf.addPage([595, 842]); // A4
  const ink = rgb(0.1, 0.12, 0.14);
  const muted = rgb(0.42, 0.45, 0.5);
  const line = rgb(0.86, 0.88, 0.9);
  const left = 56;
  const right = 539;
  let y = 770;

  const text = (value: string, x: number, size = 10, font = regular, color = ink) =>
    page.drawText(value, { x, y, size, font, color });
  const textRight = (value: string, size = 10, font = regular, color = ink) =>
    text(value, right - font.widthOfTextAtSize(value, size), size, font, color);
  const rule = () => page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.75, color: line });

  text("ReadingPro", left, 18, bold);
  textRight("HÓA ĐƠN", 18, bold);
  y -= 22;
  textRight(`Số: ${order.paymentCode}`, 10, regular, muted);
  y -= 40;

  const refunded = order.status === "REFUNDED";
  const facts: [string, string][] = [
    ["Khách hàng", buyer.name ? `${buyer.name} (${buyer.email})` : buyer.email],
    ["Ngày thanh toán", order.paidAt ? formatDateTime(order.paidAt) : "—"],
    ["Phương thức", "Chuyển khoản VietQR"],
    ["Trạng thái", refunded ? `Đã hoàn tiền${order.refundedAt ? ` ngày ${formatDate(order.refundedAt)}` : ""}` : "Đã thanh toán"],
  ];
  for (const [label, value] of facts) {
    text(label, left, 10, regular, muted);
    text(value, left + 120, 10);
    y -= 18;
  }
  y -= 20;

  text("Mô tả", left, 10, bold, muted);
  textRight("Thành tiền", 10, bold, muted);
  y -= 10;
  rule();
  y -= 20;
  text(`ReadingPro ${PLAN_LABELS[order.planCode].name}`, left, 11);
  textRight(formatVnd(order.amount), 11);
  y -= 14;
  rule();
  y -= 24;
  text("Tổng cộng", left + 300, 12, bold);
  textRight(formatVnd(order.amount), 12, bold);
  y -= 60;
  text("Cảm ơn bạn đã sử dụng ReadingPro.", left, 9, regular, muted);

  const blob = new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: `hoa-don-${order.paymentCode}.pdf` });
  link.click();
  URL.revokeObjectURL(url);
}
