"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PillInputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

export function PillInput({ className, error, ...props }: PillInputProps) {
  return (
    <Input
      className={cn(
        "!rounded-full text-center py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/10",
        error && "border-coral focus:border-coral focus:ring-coral/10",
        className
      )}
      {...props}
    />
  );
}
