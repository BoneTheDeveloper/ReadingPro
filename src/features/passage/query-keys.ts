// Query keys live in their own module so Server Components can import them
// without pulling in client-only React hooks (useQuery, useEffect, etc).
// See https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults

export const passageKeys = {
  all: ["passages"] as const,
  list: () => [...passageKeys.all, "list"] as const,
  detail: (id: string) => [...passageKeys.all, "detail", id] as const,
};
