import {
  createContext,
  Outlet,
  redirect,
  useLoaderData,
  type LoaderFunctionArgs,
  type MiddlewareFunction,
} from "react-router";
import { authClient } from "@/client/lib/auth/auth-client";
import { StoreProvider } from "@/client/lib/store/store-provider";
import { DashboardSidebar } from "@/client/components/layout/dashboard-sidebar";
import type { SessionUser } from "@/client/lib/store/session-slice";

const sessionUserContext = createContext<SessionUser>();

// Middleware finishes before any page clientLoader starts, so a signed-out
// visit redirects once instead of racing the pages' API calls into 401s.
const requireSession: MiddlewareFunction = async ({ context }) => {
  const { data: session, error } = await authClient.getSession();
  if (error) throw new Error(error.message ?? error.statusText);
  if (!session) throw redirect("/login");

  const { name, email, image } = session.user;
  // Only plain fields go into the store; the session's Date fields would
  // trip Redux's serializability check.
  context.set(sessionUserContext, { name, email, image });
};

export const clientMiddleware = [requireSession];

export function clientLoader({ context }: LoaderFunctionArgs) {
  return context.get(sessionUserContext);
}

export default function DashboardLayout() {
  const user = useLoaderData<typeof clientLoader>();

  return (
    <StoreProvider user={user}>
      <DashboardSidebar>
        <Outlet />
      </DashboardSidebar>
    </StoreProvider>
  );
}
