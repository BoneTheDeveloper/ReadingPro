import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, JetBrains_Mono, Lora } from "next/font/google";
import { VercelSpeedInsights } from "@/components/system/vercel-speed-insights";
import { ThemeProvider } from "@/components/provider/theme-provider";
import { routing } from "@/i18n/routing";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "vietnamese"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} ${lora.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden flex flex-col font-sans">
        <ClerkProvider
          signInUrl={`/${locale}/sign-in`}
          signUpUrl={`/${locale}/sign-up`}
          afterSignOutUrl={`/${locale}/sign-in`}
        >
          <ThemeProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
            </NextIntlClientProvider>
          </ThemeProvider>
        </ClerkProvider>
        <VercelSpeedInsights />
      </body>
    </html>
  );
}
