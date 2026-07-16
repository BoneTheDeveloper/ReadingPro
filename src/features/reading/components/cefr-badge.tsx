import type { CEFRLevel } from "@/lib/cefr";
import { CEFR_BADGE_VARIANT, type BadgeVariant } from "@/components/ui/badge";

// CEFR visual mapping per design.md §6:
// - A = green family, B = amber family, C = coral family
// - Use badge variants so CEFR gets the pill shape + paired text color automatically
export function getCEFRBadgeVariant(level: CEFRLevel): BadgeVariant {
  return CEFR_BADGE_VARIANT[level];
}
