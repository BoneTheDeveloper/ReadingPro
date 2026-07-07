import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind CSS classes with conflict resolution.
// Combines clsx (conditional classes) + tailwind-merge (deduplicates conflicting utilities)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert Date or string to ISO string. Null-safe. */
export function toIsoString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toISOString();
}
