"use client";

import { cn } from "@/client/lib/utils";

type Option<T> = { value: T; label: string };

interface OptionFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

/** A labelled row of choices in a generation-options form. */
export function OptionField({ label, hint, children }: OptionFieldProps) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-semibold text-foreground">
        {label}
        {hint && <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({ selected, onClick, children, role }: { selected: boolean; onClick: () => void; children: React.ReactNode; role: "radio" | "checkbox" }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 py-1.5 text-[13.5px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : "border-border bg-surface text-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

/** Pick exactly one value. */
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
    <div role="radiogroup" className="contents">
      {options.map((o) => (
        <Chip key={String(o.value)} role="radio" selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

/** Pick any number of values; `min` stops the last one from being unticked. */
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
    <>
      {options.map((o) => (
        <Chip key={o.value} role="checkbox" selected={value.includes(o.value)} onClick={() => toggle(o.value)}>
          {o.label}
        </Chip>
      ))}
    </>
  );
}
