import type { auth } from "./auth";

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;