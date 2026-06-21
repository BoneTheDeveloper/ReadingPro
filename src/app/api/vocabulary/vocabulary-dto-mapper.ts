export function toVocabularyDTO(item: {
  id: string;
  displayText: string;
  translation: string;
  type: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
  return {
    id: item.id,
    displayText: item.displayText,
    translation: item.translation,
    type: item.type,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}
