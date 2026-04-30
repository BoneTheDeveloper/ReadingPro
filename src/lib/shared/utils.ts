import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Merges Tailwind CSS classes with conflict resolution.
// e.g. cn("px-4 py-2", isActive && "bg-blue-500", className)
// Combines clsx (conditional classes) + tailwind-merge (deduplicates conflicting utilities)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
