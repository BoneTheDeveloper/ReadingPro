import { Hono } from "hono";
import { auth } from "@/server/modules/auth/auth";
import { passageRoutes } from "@/server/modules/passage/passage-routes";
import { artifactRoutes } from "@/server/modules/studio/artifact-routes";
import { vocabularyRoutes } from "@/server/modules/vocabulary/vocabulary-routes";
import { translateRoutes } from "@/server/modules/reading/translate-routes";
import { aiChatRoutes } from "@/server/modules/studio/ai-chat-routes";

const app = new Hono().basePath("/api");

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

app.route("/passage", passageRoutes);
app.route("/artifact", artifactRoutes);
app.route("/vocabulary", vocabularyRoutes);
app.route("/translate", translateRoutes);
app.route("/ai-chat", aiChatRoutes);

export default app;
