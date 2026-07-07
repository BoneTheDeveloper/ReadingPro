"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/services/i18n/navigation";
import { routing } from "@/services/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const localeLabels: Record<string, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

interface LanguageSwitcherProps {
  variant?: "default" | "rail";
}

export function LanguageSwitcher({
  variant = "default",
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const isRail = variant === "rail";

  function handleSwitch(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            isRail
              ? "w-10 h-10 text-white/60 hover:text-white font-bold text-xs"
              : "text-xs font-bold text-muted-foreground hover:text-primary",
            "uppercase",
          )}
          aria-label="Switch language"
          title={localeLabels[locale] ?? locale}
        >
          {locale}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSwitch(loc)}
            className={locale === loc ? "font-semibold" : ""}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
