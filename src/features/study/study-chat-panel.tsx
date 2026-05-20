"use client";

interface StudyChatPanelProps {
  passageId: string;
  passageTitle: string;
}

export function StudyChatPanel({ passageTitle }: StudyChatPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Chat about: {passageTitle}
      </p>
      <p className="text-xs text-muted-foreground">
        AI chat coming soon.
      </p>
    </div>
  );
}
