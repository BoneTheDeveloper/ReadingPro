// Sends the webhook SePay would send for an incoming transfer, so a checkout
// can be completed locally without a bank account:
//   pnpm sepay:mock-webhook RPROXXXXXXXX [amount]
// Reads SEPAY_WEBHOOK_API_KEY from .env; posts to the API on port 3001 unless
// SEPAY_MOCK_URL is set.
const [paymentCode, amountArg] = process.argv.slice(2);
if (!paymentCode) {
  console.error("Usage: pnpm sepay:mock-webhook <paymentCode> [amount]");
  process.exit(1);
}

const apiKey = process.env.SEPAY_WEBHOOK_API_KEY;
if (!apiKey) {
  console.error("Set SEPAY_WEBHOOK_API_KEY in .env first.");
  process.exit(1);
}

const url = process.env.SEPAY_MOCK_URL ?? "http://localhost:3001/api/webhooks/sepay";
const now = new Date();
const payload = {
  id: Math.floor(now.getTime() / 1000) * 1000 + Math.floor(Math.random() * 1000),
  gateway: "MBBank",
  transactionDate: now.toISOString().slice(0, 19).replace("T", " "),
  accountNumber: process.env.SEPAY_BANK_ACCOUNT ?? "0000000000",
  subAccount: null,
  code: null,
  content: `${paymentCode} chuyen tien`,
  transferType: "in",
  description: `Mock transfer ${paymentCode}`,
  transferAmount: Number(amountArg ?? 49000),
  accumulated: 0,
  referenceCode: `MOCK${now.getTime()}`,
};

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Apikey ${apiKey}` },
  body: JSON.stringify(payload),
});
console.log(res.status, await res.text());

export {};
