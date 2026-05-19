import Link from "next/link";
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

function getNextAction(stats: UserProgress, passages: PassageOverview) {
  if (stats.dueCards > 0) {
    return {
      eyebrow: "Due now",
      title: `Review ${pluralize(stats.dueCards, "card")}`,
      body: "Clear the queue before adding new material.",
      href: "/study",
      cta: "Start review",
      urgency: "High priority",
      icon: Target,
      tone: "border-[#efd08a] bg-[#fff6dc] text-[#9a6815]",
      iconTone: "bg-[#f8edcf] text-[#9a6815]",
    };
  }

  if (passages.totalPassages === 0) {
    return {
      eyebrow: "Start here",
      title: "Upload your first reading",
      body: "One short passage is enough to begin.",
      href: "/study",
      cta: "Add content",
      urgency: "Setup",
      icon: Upload,
      tone: "border-[#b9dcca] bg-[#edf8f2] text-[#25785d]",
      iconTone: "bg-[#e1f2ea] text-[#25785d]",
    };
  }

  if (stats.totalCards === 0) {
    return {
      eyebrow: "Build deck",
      title: "Generate questions",
      body: "Turn a saved passage into review cards.",
      href: "/study",
      cta: "Open study room",
      urgency: "Next step",
      icon: Sparkles,
      tone: "border-[#c6d2f2] bg-[#eef3ff] text-[#345caa]",
      iconTone: "bg-[#e2e9fb] text-[#345caa]",
    };
  }

  if (stats.todayReviews === 0) {
    return {
      eyebrow: "Today",
      title: "Keep the streak alive",
      body: "A short review session keeps your rhythm warm.",
      href: "/study",
      cta: "Do a quick session",
      urgency: "Today",
      icon: Flame,
      tone: "border-[#efc3a7] bg-[#fff1e8] text-[#a35421]",
      iconTone: "bg-[#f8dfcf] text-[#a35421]",
    };
  }

  return {
    eyebrow: "Queue clear",
    title: "Add one useful passage",
    body: "Your reviews are calm. Feed the next session.",
    href: "/study",
    cta: "Add content",
    urgency: "Low pressure",
    icon: BookOpen,
    tone: "border-[#d8d0bf] bg-[#fffdf8] text-[#5f5138]",
    iconTone: "bg-[#ece5d7] text-[#8a6a24]",
  };
}

function getProgressCards(stats: UserProgress, passages: PassageOverview) {
  const cards = [
    {
      label: "Reviews due",
      value: stats.dueCards > 0 ? stats.dueCards.toLocaleString() : "Clear",
      helper: stats.dueCards > 0 ? "Waiting now" : "No review debt",
      icon: Target,
      tone: stats.dueCards > 0 ? "text-amber-700 bg-amber-100" : "text-emerald-700 bg-emerald-100",
    },
    {
      label: "Current streak",
      value: stats.streakDays > 0 ? `${stats.streakDays}d` : "Start",
      helper: stats.streakDays > 0 ? "active practice run" : "One review begins it",
      icon: Flame,
      tone: stats.streakDays > 0 ? "text-orange-700 bg-orange-100" : "text-slate-700 bg-slate-100",
    },
    {
      label: "Today",
      value: stats.todayReviews > 0 ? stats.todayReviews.toLocaleString() : "Ready",
      helper: stats.todayReviews > 0 ? "reviews logged" : "No session yet",
      icon: CalendarCheck,
      tone: stats.todayReviews > 0 ? "text-sky-700 bg-sky-100" : "text-indigo-700 bg-indigo-100",
    },
  ];

  if (passages.totalPassages > 0) {
    cards.push({
      label: "Reading library",
      value: passages.totalPassages.toLocaleString(),
      helper: `${passages.totalWords.toLocaleString()} words saved`,
      icon: BookOpen,
      tone: "text-emerald-700 bg-emerald-100",
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

export default function DashboardPage() {
  const stats = mockStats;
  const passageOverview = mockPassageOverview;
  const { recentPassages } = passageOverview;
  const displayName = mockDashboardProfile.firstName;
  const nextAction = getNextAction(stats, passageOverview);
  const progressCards = getProgressCards(stats, passageOverview);
  const maturePercent =
    stats.totalCards > 0 ? Math.round((stats.matureCards / stats.totalCards) * 100) : 0;
  const showMastery = stats.totalCards >= 10;
  const milestoneItems = [
    { label: "Save a passage", done: passageOverview.totalPassages > 0 },
    { label: "Create review cards", done: stats.totalCards > 0 },
    { label: "Complete today's review", done: stats.todayReviews > 0 },
  ];

  return (
    <DashboardSidebar>
      <div className="h-full overflow-y-auto bg-[#f7f5ef] text-[#18212f]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(330px,0.82fr)]">
            <div className="relative overflow-hidden rounded-2xl bg-[#172033] p-6 text-white shadow-[0_24px_70px_rgba(23,32,51,0.18)] sm:p-8">
              <div className="absolute right-0 top-0 h-48 w-48 translate-x-16 -translate-y-20 rounded-full bg-[#f2b84b]/30 blur-3xl" />
              <div className="absolute bottom-0 right-24 h-32 w-32 translate-y-12 rounded-full bg-[#59c3a6]/20 blur-2xl" />
              <div className="relative z-10 max-w-2xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f2b84b]">
                  Study dashboard
                </p>
                <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                  Welcome back, {displayName}.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/72">
                  {getMomentumCopy(stats, passageOverview)}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={nextAction.href}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-11 bg-[#f2b84b] px-4 text-[#172033] hover:bg-[#f6c86e]",
                    )}
                  >
                    <nextAction.icon className="size-4" />
                    {nextAction.cta}
                  </Link>
                  <Link
                    href="/study"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-11 border-white/20 bg-white/8 px-4 text-white hover:bg-white/14 hover:text-white",
                    )}
                  >
                    <BookOpen className="size-4" />
                    Open study room
                  </Link>
                </div>
              </div>
            </div>

            <aside className={cn("rounded-2xl border p-5 shadow-[0_16px_50px_rgba(56,45,28,0.08)]", nextAction.tone)}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em]">
                    Next action
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
                    "h-10 bg-[#172033] text-white hover:bg-[#24324d]",
                  )}
                >
                  {nextAction.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {progressCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[#ddd4c4] bg-[#fffdf8] p-5 shadow-[0_10px_35px_rgba(56,45,28,0.06)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", card.tone)}>
                    <card.icon className="size-5" />
                  </div>
                  <span className="text-2xl font-semibold tabular-nums sm:text-3xl">{card.value}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-[#343b45]">{card.label}</p>
                <p className="mt-1 text-sm text-[#66604f]">{card.helper}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
            <div className="rounded-2xl border border-[#ddd4c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(56,45,28,0.07)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6a24]">
                    Recent reading
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Pick up where you left off</h2>
                </div>
                <Link
                  href="/study"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 self-start border-[#cfc2ac] bg-transparent",
                  )}
                >
                  View study room
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <div className="mt-5 divide-y divide-[#e6dece]">
                {recentPassages.length > 0 ? (
                  recentPassages.map((passage) => (
                    <Link
                      key={passage.id}
                      href="/study"
                      className="group grid gap-4 py-4 transition-colors hover:bg-[#f7f1e6] sm:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[#18212f] group-hover:text-[#8a5d12]">
                            {passage.title}
                          </h3>
                          {passage.originalLevel && (
                            <span className="rounded-full bg-[#edf3e8] px-2.5 py-1 text-xs font-semibold text-[#3f6f35]">
                              {passage.originalLevel}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#66604f]">
                          {passage.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#66604f] sm:justify-end">
                        <span className="tabular-nums">{passage.wordCount.toLocaleString()} words</span>
                        <span>{formatDate(passage.createdAt)}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">No saved passages yet</h3>
                      <p className="mt-1 max-w-xl text-sm leading-6 text-[#66604f]">
                        Add a short article, exam passage, or PDF to start building questions and flashcards.
                      </p>
                    </div>
                    <Link
                      href="/study"
                      className={cn(
                        buttonVariants(),
                        "h-10 bg-[#172033] text-white hover:bg-[#24324d]",
                      )}
                    >
                      <Upload className="size-4" />
                      Upload first text
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-2xl border border-[#ddd4c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(56,45,28,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#f8edcf] text-[#9a6815]">
                    <Clock3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6a24]">
                      Momentum
                    </p>
                    <h2 className="text-xl font-semibold">{nextAction.eyebrow}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#66604f]">
                  {getMomentumCopy(stats, passageOverview)}
                </p>
              </div>

              {showMastery ? (
                <div className="rounded-2xl border border-[#ddd4c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(56,45,28,0.07)]">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#e7f4ee] text-[#25785d]">
                      <Brain className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6a24]">
                        Deck health
                      </p>
                      <h2 className="text-xl font-semibold">{maturePercent}% mature</h2>
                    </div>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#ece5d7]">
                    <div className="h-full rounded-full bg-[#59a88c]" style={{ width: `${maturePercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#66604f]">
                    {pluralize(stats.totalCards, "card")} in rotation.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#ddd4c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(56,45,28,0.07)]">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#e7f4ee] text-[#25785d]">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6a24]">
                        First milestone
                      </p>
                      <h2 className="text-xl font-semibold">Build the loop</h2>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {milestoneItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-3 text-sm leading-6 text-[#4c4a42]">
                        <CheckCircle2
                          className={cn(
                            "size-4 shrink-0",
                            item.done ? "text-[#59a88c]" : "text-[#c7bda9]",
                          )}
                        />
                        <span className={cn(item.done && "font-medium text-[#343b45]")}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              { href: "/study", icon: Target, title: "Review queue", text: stats.dueCards > 0 ? `${pluralize(stats.dueCards, "card")} due now.` : "Queue is clear." },
              { href: "/study", icon: FileText, title: "Add reading", text: "Bring in a passage worth practicing." },
              { href: "/study", icon: Sparkles, title: "Generate questions", text: "Create cards from saved reading." },
            ].map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-xl border border-[#ddd4c4] bg-[#fffdf8] p-5 transition hover:-translate-y-0.5 hover:border-[#c59a45] hover:shadow-[0_16px_45px_rgba(56,45,28,0.09)]"
              >
                <action.icon className="size-5 text-[#9a6815]" />
                <h3 className="mt-4 text-base font-semibold">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#66604f]">{action.text}</p>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </DashboardSidebar>
  );
}
