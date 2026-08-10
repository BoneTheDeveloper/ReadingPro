import { QueryClient, QueryCache, MutationCache, isServer } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/fetch-json";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (count, err) =>
          isApiError(err) && err.status < 500 ? false : count < 3,
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
        if (isApiError(err) && err.status < 500) return;
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
