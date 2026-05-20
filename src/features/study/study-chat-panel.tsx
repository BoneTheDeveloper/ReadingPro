"use client";

import { useTranslations } from "next-intl";

interface StudyChatPanelProps {
  passageId: string;
  passageTitle: string;
}

export function StudyChatPanel({ passageTitle }: StudyChatPanelProps) {
  const t = useTranslations("Study");

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        {t("chatAboutPassage", { title: passageTitle })}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("aiChatComingSoon")}
      </p>
    </div>
  );
}
