export const MAX_TRANSLATE_TEXT_LENGTH = 500;
export const MAX_TRANSLATE_CONTEXT_LENGTH = 4000;

export function clampTranslationContext(
  context: string,
  selectedText: string,
  maxLength = MAX_TRANSLATE_CONTEXT_LENGTH,
) {
  if (context.length <= maxLength) return context;

  const selectedIndex = context.indexOf(selectedText);
  if (selectedIndex === -1) return context.slice(0, maxLength);

  const halfWindow = Math.floor((maxLength - selectedText.length) / 2);
  const start = Math.max(0, Math.min(selectedIndex - halfWindow, context.length - maxLength));

  return context.slice(start, start + maxLength);
}
