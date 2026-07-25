"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PillButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "primary" | "secondary";
}

export function PillButton({
  variant = "primary",
  className,
  ...props
}: PillButtonProps) {
  return (
    <Button
      className={cn(
        variant === "primary" && "bg-primary text-white shadow-md hover:bg-primary/90 hover:-translate-y-px",
        variant === "secondary" && "bg-[#EAE5DB] text-foreground hover:bg-[#E0DBD3]",
        "!rounded-full",
        className
      )}
      {...props}
    />
  );
}
