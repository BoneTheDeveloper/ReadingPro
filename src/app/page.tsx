import Link from "next/link";
import {
  BookOpen,
  BarChart3,
  Upload,
  GraduationCap,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Plus,
} from "lucide-react";

const features = [
  {
    href: "/study",
    icon: Upload,
    title: "Upload Content",
    description:
      "Upload text or PDF files for AI-powered analysis and question generation.",
  },
  {
    href: "/study",
    icon: BookOpen,
    title: "Study Room",
    description:
      "Read passages, test your comprehension, and track your vocabulary growth.",
  },
  {
    href: "/progress",
    icon: BarChart3,
    title: "Progress Tracker",
    description:
      "Monitor your learning progress with detailed analytics and insights.",
  },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Icon sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-20 lg:fixed lg:inset-y-0 bg-surface-container-low border-r border-outline-variant/30 items-center py-8 z-40">
        <div className="mb-10 text-primary">
          <GraduationCap className="w-7 h-7" />
        </div>

        <nav className="flex-1 w-full px-3 space-y-2 flex flex-col items-center">
          <span className="w-full flex justify-center items-center p-3 rounded-lg text-primary bg-accent/80 border-r-4 border-primary transition-colors duration-200" title="Dashboard">
            <LayoutDashboard className="w-5 h-5" />
          </span>
          <Link
            href="/study"
            className="w-full flex justify-center items-center p-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-accent/60 transition-colors duration-200"
            title="Study Room"
          >
            <BookOpen className="w-5 h-5" />
          </Link>
          <Link
            href="/progress"
            className="w-full flex justify-center items-center p-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-accent/60 transition-colors duration-200"
            title="Progress"
          >
            <BarChart3 className="w-5 h-5" />
          </Link>
        </nav>

        <div className="px-3 w-full">
          <Link
            href="/study"
            className="mt-6 w-full py-3 flex justify-center bg-primary text-on-primary rounded-xl shadow-sm hover:opacity-90 active:scale-[0.99] transition-all"
            title="New Reading"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>

        <div className="mt-auto pt-6 w-full px-3 border-t border-outline-variant/30 space-y-2 flex flex-col items-center">
          <button className="w-full flex justify-center p-2 rounded-lg text-on-surface-variant hover:bg-accent/60 transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <button className="w-full flex justify-center p-2 rounded-lg text-on-surface-variant hover:bg-accent/60 transition-colors" title="Help">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-20 flex flex-col">
        {/* Top bar */}
        <header className="hidden lg:flex fixed top-0 right-0 w-[calc(100%-5rem)] h-16 z-30 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 items-center justify-between px-8">
          <div />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[14px] font-semibold text-on-surface leading-none">
                  Placeholder
                </p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">
                  Placeholder
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-[14px] font-bold">P</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 pt-16 px-12 pb-12 max-w-[1440px] mx-auto w-full">
          <header className="mb-12 pt-8">
            <h2 className="text-[32px] font-bold text-primary tracking-[-0.02em] leading-[1.2]">
              English Reading Training
            </h2>
            <p className="text-[16px] text-on-surface-variant mt-2 leading-[1.6]">
              AI-powered reading comprehension app for English learners.
            </p>
          </header>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group bg-surface-container-lowest rounded-xl p-8 flex flex-col shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_10px_30px_rgba(59,92,228,0.08)] transition-shadow duration-200"
              >
                <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-[16px] font-semibold text-on-surface mb-2">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-on-surface-variant leading-[1.5]">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Vocabulary chips */}
          <section className="mt-12">
            <h3 className="text-[20px] font-semibold text-on-surface mb-6 tracking-[-0.01em]">
              Features
            </h3>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-surface-container-high text-primary text-[14px] font-semibold rounded-full">
                Vocabulary Chips
              </span>
              <span className="px-4 py-2 bg-surface-container-high text-primary text-[14px] font-semibold rounded-full">
                Reading Speed Track
              </span>
              <span className="px-4 py-2 bg-surface-container-high text-primary text-[14px] font-semibold rounded-full">
                Contextual AI Analysis
              </span>
            </div>
          </section>
        </main>
      </div>

      {/* FAB */}
      <Link
        href="/study"
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50"
      >
        <Plus className="w-6 h-6" />
        <div className="absolute right-full mr-4 bg-on-surface text-surface px-3 py-1 rounded-lg text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Quick Study
        </div>
      </Link>
    </div>
  );
}
