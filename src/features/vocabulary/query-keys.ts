// Query keys live in their own module so Server Components can import them
// without pulling in client-only React hooks (useQuery, useEffect, etc).
// See https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults

export const vocabularyKeys = {
  all: ["vocabulary"] as const,
  list: () => [...vocabularyKeys.all, "list"] as const,
};
