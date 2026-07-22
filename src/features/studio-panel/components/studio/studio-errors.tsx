"use client";

import { useTranslations } from "next-intl";

export function useGenerationErrorMessage() {
  const t = useTranslations("Study");

  return (): string => t("genErrorGeneric");
}
