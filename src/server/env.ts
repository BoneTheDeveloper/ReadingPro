import type pino from "pino";
import type { auth } from "@/server/modules/auth/auth";
import type { ErrorReason } from "@/shared/api-error";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type RequestVariables = {
  requestId: string;
  log: pino.Logger;
  /** Set by onError/notFound so the access log line carries the failure reason. */
  errorReason?: ErrorReason;
};

/** Context available to every API route. */
export type AppEnv = { Variables: RequestVariables };

/** Context behind `requireSession`: the signed-in user is guaranteed. */
export type AuthEnv = {
  Variables: RequestVariables & {
    user: AuthSession["user"];
    session: AuthSession["session"];
  };
};
