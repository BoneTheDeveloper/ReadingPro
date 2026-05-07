import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <GraduationCap className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            ReadingPro
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
