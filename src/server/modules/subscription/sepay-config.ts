// SePay receives the transfers on the shop's bank account and calls our
// webhook for each one. The account details build the VietQR image.
import { AppError } from "@/server/lib/errors";

export type SepayConfig = {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  webhookApiKey: string;
};

/**
 * Stand-ins for a machine without a SePay account. The QR points at no real
 * account, and `pnpm sepay:mock-webhook` sends the same key, so a checkout can
 * be completed locally. Never used in production.
 */
const DEV_SEPAY_CONFIG: SepayConfig = {
  bankCode: "MB",
  accountNumber: "0000000000",
  accountName: "READINGPRO DEV",
  webhookApiKey: "dev-sepay-key",
};

/** Each SEPAY_* variable, or its dev stand-in outside production; throws `payment.not_configured` when one is missing. */
export function requireSepayConfig(): SepayConfig {
  const dev = process.env.NODE_ENV === "production" ? null : DEV_SEPAY_CONFIG;
  const config = {
    bankCode: process.env.SEPAY_BANK_CODE || dev?.bankCode || "",
    accountNumber: process.env.SEPAY_BANK_ACCOUNT || dev?.accountNumber || "",
    accountName: process.env.SEPAY_ACCOUNT_NAME || dev?.accountName || "",
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || dev?.webhookApiKey || "",
  };
  if (Object.values(config).some((value) => value === "")) {
    throw new AppError("payment.not_configured", "SEPAY_* environment variables are not set");
  }
  return config;
}

/** The VietQR image SePay documents: scanning it fills bank, amount and note in any banking app. */
export function buildVietQrUrl(config: SepayConfig, amount: number, note: string): string {
  const params = new URLSearchParams({
    acc: config.accountNumber,
    bank: config.bankCode,
    amount: String(amount),
    des: note,
    template: "compact",
  });
  return `https://vietqr.app/img?${params}`;
}
