// SePay receives the transfers on the shop's bank account and calls our
// webhook for each one. The account details build the VietQR image.
import { AppError } from "@/server/lib/errors";

export type SepayConfig = {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  webhookApiKey: string;
};

/** Throws `payment.not_configured` when any SEPAY_* variable is missing. */
export function requireSepayConfig(): SepayConfig {
  const config = {
    bankCode: process.env.SEPAY_BANK_CODE ?? "",
    accountNumber: process.env.SEPAY_BANK_ACCOUNT ?? "",
    accountName: process.env.SEPAY_ACCOUNT_NAME ?? "",
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY ?? "",
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
