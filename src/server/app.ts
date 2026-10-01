import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { auth } from "@/server/modules/auth/auth";
import { requestContext } from "@/server/middleware/request-context";
import { AppError, onError } from "@/server/lib/errors";
import { passageRoutes } from "@/server/modules/passage";
import { artifactRoutes } from "@/server/modules/artifact";
import { vocabularyRoutes } from "@/server/modules/vocabulary/vocabulary-routes";
import { vocabularySetRoutes } from "@/server/modules/vocabulary/vocabulary-set-routes";
import { reviewRoutes } from "@/server/modules/vocabulary/review-routes";
import { translateRoutes } from "@/server/modules/reading/translate-routes";
import { chatRoutes } from "@/server/modules/chat";
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
  .route("/vocabulary-set", vocabularySetRoutes)
  .route("/review", reviewRoutes)
  .route("/translate", translateRoutes)
  .route("/ai-chat", chatRoutes)
  .notFound((c) => {
    const error = new AppError("route.not_found", `No route for ${c.req.method} ${c.req.path}`);
    c.set("errorReason", error.reason);
    return c.json(error.toBody(), error.status);
  })
  .onError(onError);

export default app;
