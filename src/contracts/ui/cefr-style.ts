import type { CEFRLevel } from '@/contracts/domain/cefr';

export function getCEFRColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: 'bg-cefr-a1/40 text-green-800',
    A2: 'bg-cefr-a2/40 text-lime-800',
    B1: 'bg-cefr-b1/40 text-yellow-800',
    B2: 'bg-cefr-b2/40 text-amber-800',
    C1: 'bg-cefr-c1/40 text-pink-800',
    C2: 'bg-cefr-c2/40 text-purple-800',
  };
  return colors[level];
}
