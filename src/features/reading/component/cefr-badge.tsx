import type { CEFRLevel } from "@/generated/prisma/enums";
import { Badge, CEFR_BADGE_VARIANT } from "@/component/ui/badge";

const FALLBACK_LEVEL: CEFRLevel = "B2";

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
