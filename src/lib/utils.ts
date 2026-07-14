import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind CSS classes with conflict resolution.
// Combines clsx (conditional classes) + tailwind-merge (deduplicates conflicting utilities)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converts a Date to ISO string, or returns null if the date is null/undefined.
export function toIsoString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === "string") return date;
  return date.toISOString();
}
