export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export function getCEFRColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-lime-100 text-lime-700',
    B1: 'bg-yellow-100 text-yellow-700',
    B2: 'bg-orange-100 text-orange-700',
    C1: 'bg-pink-100 text-pink-700',
    C2: 'bg-purple-100 text-purple-700',
  };
  return colors[level];
}

export function getCEFRLabel(level: CEFRLevel): string {
  const labels: Record<CEFRLevel, string> = {
    A1: 'Beginner',
    A2: 'Elementary',
    B1: 'Intermediate',
    B2: 'Upper Intermediate',
    C1: 'Advanced',
    C2: 'Mastery',
  };
  return labels[level];
}
