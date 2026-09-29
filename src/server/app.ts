import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { auth } from "@/server/modules/auth/auth";
import { requestContext } from "@/server/middleware/request-context";
import { AppError, onError } from "@/server/lib/errors";
import { passageRoutes } from "@/server/modules/passage/passage-routes";
import { artifactRoutes } from "@/server/modules/studio/artifact-routes";
import { vocabularyRoutes } from "@/server/modules/vocabulary/vocabulary-routes";
import { translateRoutes } from "@/server/modules/reading/translate-routes";
import { aiChatRoutes } from "@/server/modules/studio/ai-chat-routes";
import type { AppEnv } from "@/server/env";

// Session checks live on each module's router, never here, so /auth/* stays public.
const app = new Hono<AppEnv>()
  .basePath("/api")
  // Before /auth so auth requests get an id and an access log line too.
  .use(requestId())
  .use(requestContext)
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/passage", passageRoutes)
  .route("/artifact", artifactRoutes)
  .route("/vocabulary", vocabularyRoutes)
  .route("/translate", translateRoutes)
  .route("/ai-chat", aiChatRoutes)
  .notFound((c) => {
    const error = new AppError("route.not_found", `No route for ${c.req.method} ${c.req.path}`);
    c.set("errorReason", error.reason);
    return c.json(error.toBody(), error.status);
  })
  .onError(onError);

export default app;
