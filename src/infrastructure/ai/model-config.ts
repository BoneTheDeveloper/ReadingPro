import "server-only";
const DEFAULT_STUDY_CHAT_MODEL = "gpt-4o-mini";

export function getStudyChatModelId(): string {
  return DEFAULT_STUDY_CHAT_MODEL;
}

export { DEFAULT_STUDY_CHAT_MODEL };
