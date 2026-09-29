import type { CEFRLevel } from "@/shared/enums";
import { Badge, type BadgeVariant } from "@/client/components/ui/badge";

const FALLBACK_LEVEL: CEFRLevel = "B2";

const CEFR_BADGE_VARIANT = {
  A1: "cefrA1",
  A2: "cefrA2",
  B1: "cefrB1",
  B2: "cefrB2",
  C1: "cefrC1",
  C2: "cefrC2",
} as const satisfies Record<CEFRLevel, BadgeVariant>;

export function CefrBadge({
  level,
  className,
}: {
  level?: CEFRLevel | null;
  className?: string;
}) {
  const resolved = level ?? FALLBACK_LEVEL;
  return (
    <Badge
      variant={CEFR_BADGE_VARIANT[resolved]}
      className={className}
    >
      {resolved}
    </Badge>
  );
}
