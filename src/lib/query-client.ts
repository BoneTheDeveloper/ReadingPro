import { QueryClient, QueryCache, MutationCache, isServer } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api/fetch-json";
import { getErrorMessage } from "@/lib/api/error-message";

let redirectingToLogin = false;

/**
 * An expired session surfaces as a 401 from any query or mutation. Send the
 * user to login once, instead of letting each component render the error.
 */
function handleUnauthorized(err: unknown, queryClient: QueryClient): boolean {
  if (isServer || !isApiError(err) || err.status !== 401) return false;
  if (redirectingToLogin || window.location.pathname.startsWith("/login")) return true;

  redirectingToLogin = true;
  queryClient.clear();
  window.location.assign("/login");
  return true;
}

function makeQueryClient() {
  const queryClient: QueryClient = new QueryClient({
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
        if (handleUnauthorized(err, queryClient)) return;
        if (query.meta?.silent) return;
        console.error("[query error]", err);
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _v, _c, mutation) => {
        if (handleUnauthorized(err, queryClient)) return;
        // Mutations whose caller renders the error inline opt out with
        // meta.silent, so the user never sees the same failure twice.
        if (!mutation.meta?.silent) toast.error(getErrorMessage(err));
        if (isApiError(err) && err.status < 500) return;
        console.error("[mutation error]", err, mutation);
      },
    }),
  });
  return queryClient;
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
