import type { CEFRLevel } from "@/lib/domain-cefr";
import { CEFR_BADGE_VARIANT, type BadgeVariant } from "@/components/ui/badge";

// CEFR visual mapping per design.md §6:
// - A = green family, B = amber family, C = coral family
// - Use badge variants so CEFR gets the pill shape + paired text color automatically
export function getCEFRBadgeVariant(level: CEFRLevel): BadgeVariant {
  return CEFR_BADGE_VARIANT[level];
}

// Backwards-compatible helper for any code that still uses raw utility classes.
// Kept for the existing test that asserts on class strings; safe to delete once
// consumers switch to the variant prop.
export function getCEFRColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "bg-cefr-a1 text-cefr-a1-text",
    A2: "bg-cefr-a2 text-cefr-a2-text",
    B1: "bg-cefr-b1 text-cefr-b1-text",
    B2: "bg-cefr-b2 text-cefr-b2-text",
    C1: "bg-cefr-c1 text-cefr-c1-text",
    C2: "bg-cefr-c2 text-cefr-c2-text",
  };
  return colors[level];
}
