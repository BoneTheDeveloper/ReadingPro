export const vocabularyKeys = {
  all: ["vocabulary"] as const,
  list: () => [...vocabularyKeys.all, "list"] as const,
};
