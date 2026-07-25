import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  FileText,
  Brain,
  Lightbulb,
  MessageCircle,
} from "lucide-react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

const BookIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default async function MarketingPage() {
  const t = await getTranslations("Marketing");
  const tCommon = await getTranslations("Common");

  const features = [
    {
      icon: FileText,
      color: "text-[#F2664A] bg-[#FCE7E1]",
      title: t("featuresSection.pdfSummary.title"),
      description: t("featuresSection.pdfSummary.description"),
    },
    {
      icon: Brain,
      color: "text-indigo bg-indigo-soft",
      title: t("featuresSection.flashcards.title"),
      description: t("featuresSection.flashcards.description"),
    },
    {
      icon: Lightbulb,
      color: "text-[#C8842A] bg-[#FBEFD8]",
      title: t("featuresSection.mindMap.title"),
      description: t("featuresSection.mindMap.description"),
    },
    {
      icon: MessageCircle,
      color: "text-success bg-success-soft",
      title: t("featuresSection.aiChat.title"),
      description: t("featuresSection.aiChat.description"),
    },
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-hover flex items-center justify-center text-white shadow-md">
                <BookIcon />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">
                {tCommon("appName")}
              </span>
            </Link>

            {/* Links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("features")}
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("howItWorks")}
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("pricing")}
              </a>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <LocaleSwitcher side="bottom" />
              <Link
                href="/login"
                className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/signup"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 px-6 rounded-full transition-colors shadow-md hover:shadow-lg"
              >
                {t("getStartedFree")}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-indigo-soft blur-[80px]" />
          <div className="absolute top-40 right-20 w-96 h-96 rounded-full bg-[#EAE5DB] blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-soft text-primary font-semibold text-sm mb-6">
                {t("hero.badge")}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.15] mb-6 tracking-tight">
                {t("hero.headline")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#7B74E8]">
                  {t("hero.headlineHighlight")}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-8 rounded-full transition-colors shadow-md text-center flex items-center justify-center gap-2"
                >
                  {t("hero.experienceNow")}
                  <ArrowRightIcon />
                </Link>
                <button
                  type="button"
                  className="bg-surface hover:bg-muted text-foreground font-semibold py-4 px-8 rounded-full transition-colors border border-border text-center flex items-center justify-center gap-2"
                >
                  {t("hero.watchVideo")}
                </button>
              </div>
            </div>

            {/* Mockup */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="relative rounded-2xl bg-white/60 backdrop-blur-xl border border-border shadow-lg overflow-hidden transform lg:rotate-y-[-10deg] lg:rotate-x-[5deg] transition-transform duration-700 lg:hover:rotate-0">
                {/* Header */}
                <div className="h-12 border-b border-border bg-white/50 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="ml-4 w-48 h-4 bg-[#EAE5DB] rounded-full" />
                </div>
                {/* Body */}
                <div className="p-6 grid grid-cols-3 gap-6 h-80">
                  {/* Sidebar */}
                  <div className="col-span-1 border-r border-border pr-4 space-y-4">
                    <div className="w-full h-8 bg-indigo-soft rounded-lg" />
                    <div className="w-3/4 h-4 bg-[#EAE5DB] rounded-full" />
                    <div className="w-2/3 h-4 bg-[#EAE5DB] rounded-full" />
                    <div className="w-5/6 h-4 bg-[#EAE5DB] rounded-full" />
                  </div>
                  {/* Content */}
                  <div className="col-span-2 space-y-4">
                    <div className="w-1/3 h-6 bg-[#EAE5DB] rounded-lg mb-6" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-indigo-soft rounded-xl border border-indigo-soft-border flex flex-col justify-center items-center text-primary gap-2">
                        <Brain className="w-6 h-6" />
                        <span className="text-xs font-bold">{t("featuresSection.flashcards.title")}</span>
                      </div>
                      <div className="h-24 bg-[#FBEFD8] rounded-xl border border-[#E8D9B8] flex flex-col justify-center items-center text-[#C8842A] gap-2">
                        <Lightbulb className="w-6 h-6" />
                        <span className="text-xs font-bold">{t("featuresSection.mindMap.title")}</span>
                      </div>
                    </div>
                    <div className="w-full h-20 bg-[#EAE5DB] rounded-xl mt-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {t("featuresSection.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("featuresSection.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background p-8 rounded-[24px] border border-border hover:shadow-lg transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(white 2px, transparent 2px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            {t("cta.subtitle")}
          </p>

          <Link
            href="/signup"
            className="inline-block bg-white text-primary font-bold text-lg py-4 px-10 rounded-full hover:bg-background transition-colors shadow-md hover:scale-105"
          >
            {t("cta.startLearningFree")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-hover flex items-center justify-center text-white">
              <BookIcon />
            </div>
            <span className="font-bold text-foreground">{tCommon("appName")}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2026 {tCommon("appName")}
          </div>
          <div className="flex gap-4">
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-[#EAE5DB] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-indigo-soft transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-[#EAE5DB] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-indigo-soft transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
