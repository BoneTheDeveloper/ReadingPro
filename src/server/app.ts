import { Hono } from "hono";
import { auth } from "@/server/lib/auth/auth";
import { passageRoutes } from "./routes/passage";
import { artifactRoutes } from "./routes/artifact";
import { vocabularyRoutes } from "./routes/vocabulary";
import { translateRoutes } from "./routes/translate";
import { aiChatRoutes } from "./routes/ai-chat";

const app = new Hono().basePath("/api");

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

app.route("/passage", passageRoutes);
app.route("/artifact", artifactRoutes);
app.route("/vocabulary", vocabularyRoutes);
app.route("/translate", translateRoutes);
app.route("/ai-chat", aiChatRoutes);

export default app;
