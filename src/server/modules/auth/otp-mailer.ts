// Delivers Better Auth's email OTPs over SMTP. Without SMTP settings, local
// development prints the code to the server log instead; production refuses.
import nodemailer, { type Transporter } from "nodemailer";
import { log } from "@/server/lib/logger";

export type OtpType = "sign-in" | "email-verification" | "forget-password" | "change-email";

const SUBJECTS: Record<OtpType, string> = {
  "sign-in": "Mã đăng nhập ReadingPro",
  "email-verification": "Mã xác thực email ReadingPro",
  "forget-password": "Mã đặt lại mật khẩu ReadingPro",
  "change-email": "Mã xác nhận đổi email ReadingPro",
};

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  const host = process.env.SMTP_HOST;
  if (!host) return undefined;
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter ??= nodemailer.createTransport({
    host,
    port,
    // Port 465 speaks TLS from the start; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendOtpEmail(email: string, otp: string, type: OtpType): Promise<void> {
  const smtp = getTransporter();
  if (!smtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST is not set; cannot send the verification code.");
    }
    log.warn({ email, otp, type }, "SMTP is not configured; the OTP is printed here instead");
    return;
  }

  await smtp.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: email,
    subject: SUBJECTS[type],
    text: `Mã của bạn là ${otp}. Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `<p>Mã của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${otp}</p><p>Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
  });
}
