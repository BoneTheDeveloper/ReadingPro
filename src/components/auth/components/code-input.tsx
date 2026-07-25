"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CodeInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  length?: number;
  onChange?: (value: string) => void;
}

export function CodeInput({ length = 6, onChange, className, ...props }: CodeInputProps) {
  const [values, setValues] = React.useState<string[]>(Array(length).fill(""));
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    onChange?.(newValues.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const newValues = pasted.split("").concat(Array(length).fill("")).slice(0, length);
    setValues(newValues);
    onChange?.(newValues.join(""));
    if (pasted.length > 0) {
      inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          value={values[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-12 text-center text-lg font-medium tracking-[0.2em] rounded-full",
            className
          )}
          {...props}
        />
      ))}
    </div>
  );
}
