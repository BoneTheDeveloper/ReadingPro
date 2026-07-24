"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown } from "lucide-react";
import { useCallback } from "react";

const locales = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
];

export function LocaleSwitcher({ variant = "default" }: { variant?: "default" | "rail" }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const currentLocale = locales.find((l) => l.code === locale);

  const handleSwitch = useCallback(
    (newLocale: string) => {
      // usePathname returns pathname WITHOUT locale prefix (when localePrefix: "as-needed")
      // Use router.replace with locale param to switch
      router.replace(pathname, { locale: newLocale });
    },
    [pathname, router],
  );

  if (variant === "rail") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="w-10 h-10 text-white/60 hover:text-white hover:bg-white/[0.08]"
          >
            <Globe className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc.code}
              onClick={() => handleSwitch(loc.code)}
              className="cursor-pointer"
            >
              <span className={locale === loc.code ? "font-semibold" : ""}>
                {loc.label}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium">{currentLocale?.label}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => handleSwitch(loc.code)}
            className="cursor-pointer"
          >
            <span className={locale === loc.code ? "font-semibold" : ""}>
              {loc.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
