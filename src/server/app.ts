import { Hono } from "hono";
import { auth } from "@/server/modules/auth/auth";
import { requestContext } from "@/server/middleware/request-context";
import { onError } from "@/server/lib/error/on-error";
import { passageRoutes } from "@/server/modules/passage/passage-routes";
import { artifactRoutes } from "@/server/modules/studio/artifact-routes";
import { vocabularyRoutes } from "@/server/modules/vocabulary/vocabulary-routes";
import { translateRoutes } from "@/server/modules/reading/translate-routes";
import { aiChatRoutes } from "@/server/modules/studio/ai-chat-routes";
import type { AppEnv } from "@/server/env";

// Session checks live on each module's router, never here, so /auth/* stays public.
const app = new Hono<AppEnv>()
  .basePath("/api")
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .use(requestContext)
  .route("/passage", passageRoutes)
  .route("/artifact", artifactRoutes)
  .route("/vocabulary", vocabularyRoutes)
  .route("/translate", translateRoutes)
  .route("/ai-chat", aiChatRoutes)
  .onError(onError);

export default app;
