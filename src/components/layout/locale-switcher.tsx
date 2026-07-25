"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

const locales = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
];

export function LocaleSwitcher({
  variant = "default",
  side = "bottom",
}: {
  variant?: "default" | "rail";
  side?: "top" | "bottom" | "left" | "right";
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (newLocale: string) => {
    if (newLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "rail" ? (
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-[11px] text-[15px] font-semibold text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            disabled={isPending}
          >
            {locale.toUpperCase()}
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            disabled={isPending}
          >
            {locale.toUpperCase()}
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side={side} align="start" className="w-40 rounded-lg border-border bg-white py-1 shadow-lg">
        {locales.map((loc) => {
          const isActive = locale === loc.code;
          return (
            <DropdownMenuItem
              key={loc.code}
              onClick={() => handleSwitch(loc.code)}
              disabled={isActive || isPending}
              className={`w-full flex items-center px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                isActive
                  ? "text-neutral-900 font-medium cursor-default"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {loc.label}
              {isActive && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto flex-shrink-0 text-neutral-400"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
