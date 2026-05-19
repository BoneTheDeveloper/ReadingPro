import type { CEFRLevel } from '@/lib/domain/cefr';

export function getCEFRColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-blue-100 text-blue-700',
    B1: 'bg-yellow-100 text-yellow-700',
    B2: 'bg-orange-100 text-orange-700',
    C1: 'bg-red-100 text-red-700',
    C2: 'bg-purple-100 text-purple-700',
  };
  return colors[level];
}
