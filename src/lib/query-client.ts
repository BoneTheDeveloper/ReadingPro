import { QueryClient, QueryCache, MutationCache, isServer } from "@tanstack/react-query";
import { isAppError } from "@/lib/error/app-error";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (count, err) =>
          isAppError(err) && err.statusCode < 500 ? false : count < 3,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (err, query) => {
        if (query.meta?.silent) return;
        console.error("[query error]", err);
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _v, _c, mutation) => {
        console.error("[mutation error]", err, mutation);
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
