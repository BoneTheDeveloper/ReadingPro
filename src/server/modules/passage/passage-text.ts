export function takeWords(text: string, count: number): string {
  const words = text.split(/\s+/);
  return words.length <= count ? text : words.slice(0, count).join(" ");
}

export function titleFromContent(content: string): string {
  const opening = content.trim().slice(0, 50);
  const lastSpace = opening.lastIndexOf(" ");
  return (lastSpace > 20 ? opening.slice(0, lastSpace) : opening).trim();
}
