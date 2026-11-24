import { MIN_SOURCE_WORDS, PLAN_PASSAGE_LIMITS, countWords } from "@/shared/plan/plans";

/**
 * The same size gate the server applies, run before upload so the user gets
 * a precise message and no request (or quota) is spent on a source that would be refused.
 */
export function sourceSizeError(text: string, isPro: boolean): string | null {
  const words = countWords(text);
  const max = PLAN_PASSAGE_LIMITS[isPro ? "PRO" : "FREE"].maxSourceWords;
  if (words < MIN_SOURCE_WORDS) return `Văn bản cần ít nhất ${MIN_SOURCE_WORDS} từ (hiện có ${words}).`;
  if (words > max) {
    const fmt = (n: number) => n.toLocaleString("vi-VN");
    return isPro
      ? `Văn bản dài ${fmt(words)} từ, vượt giới hạn ${fmt(max)} từ. Hãy chia thành nhiều phần.`
      : `Văn bản dài ${fmt(words)} từ, vượt giới hạn ${fmt(max)} từ của gói Free. Hãy chia nhỏ hoặc nâng cấp Pro (tối đa ${fmt(PLAN_PASSAGE_LIMITS.PRO.maxSourceWords)} từ).`;
  }
  return null;
}
