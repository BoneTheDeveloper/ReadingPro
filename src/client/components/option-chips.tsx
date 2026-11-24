"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/client/lib/utils";

type Option<T> = { value: T; label: string };

interface OptionFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

/**
 * A labelled group of choices. The hint sits on the label's row, right-aligned,
 * so it never wraps under the label.
 */
export function OptionField({ label, hint, children }: OptionFieldProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-[13.5px] font-semibold text-foreground">
          {label}
        </span>
        {hint && <span className="shrink-0 text-[12px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Pick exactly one value: a segmented control on a muted track, so the
 * options read as one control rather than loose buttons. Cells share the
 * width equally and wrap to a new row only when they cannot fit.
 */
export function SingleChoice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-1 rounded-[10px] bg-muted p-1"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              // Weight stays the same in both states so selecting never reflows the row.
              "min-h-9 rounded-[7px] px-2 py-1.5 text-center text-[13px] font-medium leading-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-surface text-primary shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pick any number of values: checkbox tiles in a fixed two-column grid, so
 * ticking or unticking never moves anything. `min` keeps the last one ticked.
 */
export function MultiChoice<T extends string>({
  options,
  value,
  onChange,
  min = 0,
}: {
  options: readonly Option<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  min?: number;
}) {
  const toggle = (v: T) => {
    if (value.includes(v)) {
      if (value.length > min) onChange(value.filter((x) => x !== v));
    } else onChange([...value, v]);
  };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((o) => {
        const selected = value.includes(o.value);
        const locked = selected && value.length <= min;
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-disabled={locked}
            title={locked ? "Cần chọn ít nhất một" : undefined}
            onClick={() => toggle(o.value)}
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-[9px] border px-2.5 py-2 text-left text-[13px] font-medium leading-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary/60 bg-primary/5 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface",
              )}
            >
              {selected && <Check className="size-3 stroke-[3]" />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
