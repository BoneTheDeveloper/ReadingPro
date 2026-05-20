import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/shared/utils";

type UserProgress = {
  totalCards: number;
  matureCards: number;
  dueCards: number;
  todayReviews: number;
  streakDays: number;
};

type PassageOverview = {
  totalPassages: number;
  totalWords: number;
  recentPassages: Array<{
    id: string;
    title: string;
    content: string;
    wordCount: number;
    createdAt: Date;
    originalLevel: string | null;
  }>;
};

const mockDashboardProfile = {
  firstName: "Mina",
};

const mockStats: UserProgress = {
  totalCards: 86,
  matureCards: 31,
  dueCards: 12,
  todayReviews: 18,
  streakDays: 9,
};

const mockPassageOverview: PassageOverview = {
  totalPassages: 7,
  totalWords: 8420,
  recentPassages: [
    {
      id: "mock-passage-1",
      title: "Why Cities Are Planting Tiny Forests",
      content:
        "A short environmental article about compact urban forests, community volunteers, and how dense native planting can cool streets while restoring local biodiversity.",
      wordCount: 930,
      createdAt: new Date("2026-05-18T09:00:00"),
      originalLevel: "B1",
    },
    {
      id: "mock-passage-2",
      title: "The Science of Better Sleep",
      content:
        "A reading passage on circadian rhythm, evening habits, and practical changes that help learners protect focus and memory during busy study weeks.",
      wordCount: 1240,
      createdAt: new Date("2026-05-16T14:30:00"),
      originalLevel: "B2",
    },
    {
      id: "mock-passage-3",
      title: "How Museums Tell Stories",
      content:
        "An essay-style passage about exhibition design, object labels, visitor pathways, and the quiet choices that turn historical artifacts into a memorable narrative.",
      wordCount: 1115,
      createdAt: new Date("2026-05-12T17:15:00"),
      originalLevel: "C1",
    },
  ],
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function pluralize(count: number, noun: string) {
  return `${count.toLocaleString()} ${count === 1 ? noun : `${noun}s`}`;
}

function getNextAction(
  stats: UserProgress,
  passages: PassageOverview,
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard">>>,
) {
  if (stats.dueCards > 0) {
    return {
      eyebrow: t("dueNow"),
      title: `Review ${pluralize(stats.dueCards, "card")}`,
      body: "Clear the queue before adding new material.",
      href: "/study" as const,
      cta: "Start review",
      urgency: "High priority",
      icon: Target,
      tone: "border-gold/40 bg-gold-soft text-gold",
      iconTone: "bg-gold/20 text-gold",
    };
  }

  if (passages.totalPassages === 0) {
    return {
      eyebrow: t("startHere"),
      title: t("uploadFirstReading"),
      body: "One short passage is enough to begin.",
      href: "/study" as const,
      cta: t("addReading"),
      urgency: "Setup",
      icon: Upload,
      tone: "border-success/30 bg-success-soft text-success",
      iconTone: "bg-success/15 text-success",
    };
  }

  if (stats.totalCards === 0) {
    return {
      eyebrow: t("buildDeck"),
      title: t("generateQuestionsTitle"),
      body: "Turn a saved passage into review cards.",
      href: "/study" as const,
      cta: t("addReading"),
      urgency: "Next step",
      icon: Sparkles,
      tone: "border-primary/20 bg-primary/5 text-primary",
      iconTone: "bg-primary/10 text-primary",
    };
  }

  if (stats.todayReviews === 0) {
    return {
      eyebrow: t("today"),
      title: t("keepStreakAlive"),
      body: "A short review session keeps your rhythm warm.",
      href: "/study" as const,
      cta: "Do a quick session",
      urgency: t("today"),
      icon: Flame,
      tone: "border-gold/40 bg-gold-soft text-gold",
      iconTone: "bg-gold/20 text-gold",
    };
  }

  return {
    eyebrow: t("queueClear"),
    title: t("addUsefulPassage"),
    body: "Your reviews are calm. Feed the next session.",
    href: "/study" as const,
    cta: t("addReading"),
    urgency: "Low pressure",
    icon: BookOpen,
    tone: "border-border bg-surface text-muted-foreground",
    iconTone: "bg-muted text-muted-foreground",
  };
}

function getProgressCards(stats: UserProgress, passages: PassageOverview, t: Awaited<ReturnType<typeof getTranslations<"Dashboard">>>) {
  const cards = [
    {
      label: t("reviewsDue"),
      value: stats.dueCards > 0 ? stats.dueCards.toLocaleString() : "Clear",
      helper: stats.dueCards > 0 ? "Waiting now" : "No review debt",
      icon: Target,
      tone: stats.dueCards > 0 ? "text-gold bg-gold-soft" : "text-success bg-success-soft",
    },
    {
      label: t("currentStreak"),
      value: stats.streakDays > 0 ? `${stats.streakDays}d` : "Start",
      helper: stats.streakDays > 0 ? "active practice run" : "One review begins it",
      icon: Flame,
      tone: stats.streakDays > 0 ? "text-gold bg-gold-soft" : "text-muted-foreground bg-muted",
    },
    {
      label: t("today"),
      value: stats.todayReviews > 0 ? stats.todayReviews.toLocaleString() : "Ready",
      helper: stats.todayReviews > 0 ? "reviews logged" : "No session yet",
      icon: CalendarCheck,
      tone: stats.todayReviews > 0 ? "text-primary bg-primary/10" : "text-primary bg-primary/10",
    },
  ];

  if (passages.totalPassages > 0) {
    cards.push({
      label: t("readingLibrary"),
      value: passages.totalPassages.toLocaleString(),
      helper: `${passages.totalWords.toLocaleString()} words saved`,
      icon: BookOpen,
      tone: "text-success bg-success-soft",
    });
  }

  return cards;
}

function getMomentumCopy(stats: UserProgress, passages: PassageOverview) {
  if (stats.dueCards > 0) {
    return `${pluralize(stats.dueCards, "card")} due now. Clear them first.`;
  }
  if (passages.totalPassages === 0) {
    return "No reading saved yet. Start with one short passage.";
  }
  if (stats.totalCards === 0) {
    return "Reading is saved. Create the first question set next.";
  }
  if (stats.todayReviews > 0) {
    return `${pluralize(stats.todayReviews, "review")} logged today. Nice rhythm.`;
  }
  return "Your review queue is calm. One short session keeps momentum.";
}

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const stats = mockStats;
  const passageOverview = mockPassageOverview;
  const { recentPassages } = passageOverview;
  const displayName = mockDashboardProfile.firstName;
  const nextAction = getNextAction(stats, passageOverview, t);
  const progressCards = getProgressCards(stats, passageOverview, t);
  const maturePercent =
    stats.totalCards > 0 ? Math.round((stats.matureCards / stats.totalCards) * 100) : 0;
  const showMastery = stats.totalCards >= 10;
  const milestoneItems = [
    { label: t("savePassage"), done: passageOverview.totalPassages > 0 },
    { label: t("createReviewCards"), done: stats.totalCards > 0 },
    { label: t("completeTodaysReview"), done: stats.todayReviews > 0 },
  ];

  return (
    <DashboardSidebar>
      <div className="h-full overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
          {/* Hero + Next Action */}
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(330px,0.82fr)]">
            <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
              <div className="absolute right-0 top-0 h-48 w-48 translate-x-16 -translate-y-20 rounded-full bg-gold/20 blur-3xl" />
              <div className="absolute bottom-0 right-24 h-32 w-32 translate-y-12 rounded-full bg-success/15 blur-2xl" />
              <div className="relative z-10 max-w-2xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gold">
                  {t("studyDashboard")}
                </p>
                <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                  {t("welcomeBack", { name: displayName })}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-primary-foreground/72">
                  {getMomentumCopy(stats, passageOverview)}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={nextAction.href}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-11 bg-gold px-4 text-primary hover:bg-gold/85",
                    )}
                  >
                    <nextAction.icon className="size-4" />
                    {nextAction.cta}
                  </Link>
                  <Link
                    href="/study"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-11 border-primary-foreground/20 bg-primary-foreground/8 px-4 text-primary-foreground hover:bg-primary-foreground/14 hover:text-primary-foreground",
                    )}
                  >
                    <BookOpen className="size-4" />
                    {t("viewStudyRoom")}
                  </Link>
                </div>
              </div>
            </div>

            <aside className={cn("rounded-2xl border p-5", nextAction.tone)}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em]">
                    {t("nextAction")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight">{nextAction.title}</h2>
                </div>
                <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", nextAction.iconTone)}>
                  <nextAction.icon className="size-5" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 opacity-85">{nextAction.body}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex w-fit items-center rounded-full border border-current/20 px-3 py-1 text-sm font-semibold">
                  {nextAction.urgency}
                </span>
                <Link
                  href={nextAction.href}
                  className={cn(
                    buttonVariants(),
                    "h-10",
                  )}
                >
                  {nextAction.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          </section>

          {/* Progress cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {progressCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border bg-surface p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", card.tone)}>
                    <card.icon className="size-5" />
                  </div>
                  <span className="text-2xl font-semibold tabular-nums sm:text-3xl">{card.value}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{card.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.helper}</p>
              </div>
            ))}
          </section>

          {/* Recent reading + sidebar */}
          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
            <div className="rounded-2xl border bg-surface p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">
                    {t("recentReading")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{t("pickUpWhereYouLeftOff")}</h2>
                </div>
                <Link
                  href="/study"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 self-start",
                  )}
                >
                  {t("viewStudyRoom")}
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <div className="mt-5 divide-y divide-border">
                {recentPassages.length > 0 ? (
                  recentPassages.map((passage) => (
                    <Link
                      key={passage.id}
                      href="/study"
                      className="group grid gap-4 py-4 transition-colors hover:bg-muted/60 sm:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
                            {passage.title}
                          </h3>
                          {passage.originalLevel && (
                            <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                              {passage.originalLevel}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {passage.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground sm:justify-end">
                        <span className="tabular-nums">{passage.wordCount.toLocaleString()} words</span>
                        <span>{formatDate(passage.createdAt)}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{t("noSavedPassages")}</h3>
                      <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                        {t("noSavedPassagesDescription")}
                      </p>
                    </div>
                    <Link
                      href="/study"
                      className={cn(buttonVariants(), "h-10")}
                    >
                      <Upload className="size-4" />
                      {t("uploadFirstText")}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-2xl border bg-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-gold-soft text-gold">
                    <Clock3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">
                      {t("momentum")}
                    </p>
                    <h2 className="text-xl font-semibold">{nextAction.eyebrow}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {getMomentumCopy(stats, passageOverview)}
                </p>
              </div>

              {showMastery ? (
                <div className="rounded-2xl border bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
                      <Brain className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">
                        {t("deckHealth")}
                      </p>
                      <h2 className="text-xl font-semibold">{t("mature", { percent: maturePercent })}</h2>
                    </div>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-success" style={{ width: `${maturePercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {t("cardsInRotation", { count: pluralize(stats.totalCards, "card") })}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">
                        {t("firstMilestone")}
                      </p>
                      <h2 className="text-xl font-semibold">{t("buildTheLoop")}</h2>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {milestoneItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-3 text-sm leading-6 text-muted-foreground">
                        <CheckCircle2
                          className={cn(
                            "size-4 shrink-0",
                            item.done ? "text-success" : "text-border",
                          )}
                        />
                        <span className={cn(item.done && "font-medium text-foreground")}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Quick actions */}
          <section className="grid gap-4 md:grid-cols-3">
            {[
              { href: "/study" as const, icon: Target, title: t("reviewQueue"), text: stats.dueCards > 0 ? `${pluralize(stats.dueCards, "card")} due now.` : "Queue is clear." },
              { href: "/study" as const, icon: FileText, title: t("addReading"), text: "Bring in a passage worth practicing." },
              { href: "/study" as const, icon: Sparkles, title: t("generateQuestions"), text: "Create cards from saved reading." },
            ].map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
              >
                <action.icon className="size-5 text-gold" />
                <h3 className="mt-4 text-base font-semibold">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.text}</p>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </DashboardSidebar>
  );
}
