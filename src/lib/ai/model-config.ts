const DEFAULT_STUDY_CHAT_MODEL = "gpt-4o-mini";
const MODEL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

function normalizeModelId(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (!MODEL_ID_PATTERN.test(trimmed)) return null;

  return trimmed;
}

export function getStudyChatModelId(): string {
  return normalizeModelId(process.env.OPENAI_STUDY_CHAT_MODEL) ?? DEFAULT_STUDY_CHAT_MODEL;
}

export function getTranslationModelId(): string {
  return normalizeModelId(process.env.OPENAI_TRANSLATION_MODEL) ?? DEFAULT_STUDY_CHAT_MODEL;
}

export { DEFAULT_STUDY_CHAT_MODEL };
