
export const artifactKeys = {
  all: ["artifacts"] as const,
  list: (passageId: string) => ["artifacts", "list", passageId] as const,
  detail: (artifactId: string) => ["artifacts", "detail", artifactId] as const,
};

export const chatKeys = {
  all: ["chat"] as const,
  history: (passageId: string) => ["chat", "history", passageId] as const,
};
