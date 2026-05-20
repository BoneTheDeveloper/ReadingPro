import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { GraduationCap } from "lucide-react";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Common");

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <GraduationCap className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            {t("appName")}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
