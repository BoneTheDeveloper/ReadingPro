"use client";

import { useTranslations } from "next-intl";
import { BookOpen, Library, BookMarked } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function DashboardOverview() {
  const t = useTranslations("Dashboard");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {t("studyDashboard")}
      </h1>
      <p className="text-muted-foreground mb-8">
        {t("welcomeBack", { name: "" })}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          href="/study"
          icon={BookOpen}
          title={t("recentReading")}
          description={t("pickUpWhereYouLeftOff")}
        />
        <QuickActionCard
          href="/vocabulary"
          icon={Library}
          title={t("vocabulary")}
          description={t("cardsInRotation", { count: 0 })}
        />
        <QuickActionCard
          href="/dictionary"
          icon={BookMarked}
          title={t("dictionary")}
          description={t("lookup")}
        />
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group p-6 rounded-2xl border border-border bg-background hover:bg-surface hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
