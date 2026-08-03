// Query keys live in their own module so Server Components can import them
// without pulling in client-only React hooks. Mirrors the passage keys split.

export const artifactKeys = {
  all: ["artifacts"] as const,
  list: (passageId: string) => ["artifacts", "list", passageId] as const,
  detail: (artifactId: string) => ["artifacts", "detail", artifactId] as const,
};
