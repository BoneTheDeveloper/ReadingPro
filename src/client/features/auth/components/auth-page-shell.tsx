import * as React from "react";

/** Centers an auth form. The body does not scroll, so this shell does on short screens. */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="min-h-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[360px]">{children}</div>
      </div>
    </div>
  );
}
