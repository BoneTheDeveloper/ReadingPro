export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';



export function getCEFRShortLabel(level: CEFRLevel): string {
  return level;
}
