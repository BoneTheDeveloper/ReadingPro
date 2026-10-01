import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/modules/auth/require-session";
import {
  endReviewSessionForUser,
  listDueCardsForUser,
  rateCardForUser,
  startReviewSessionForUser,
} from "./review-service";
import {
  ReviewDueQuerySchema,
  ReviewRatingInputSchema,
  ReviewSessionCreateInputSchema,
  ReviewSessionIdParamSchema,
} from "@/shared/vocabulary/review-schema";
import type { AuthEnv } from "@/server/env";

export const reviewRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/due", validate("query", ReviewDueQuerySchema), async (c) => {
    return c.json(await listDueCardsForUser(c.var.user.id, c.req.valid("query").setId));
  })
  .post("/sessions", validate("json", ReviewSessionCreateInputSchema), async (c) => {
    const session = await startReviewSessionForUser(c.var.user.id, c.req.valid("json").setId);
    return c.json(session, 201);
  })
  .post(
    "/sessions/:id/ratings",
    validate("param", ReviewSessionIdParamSchema),
    validate("json", ReviewRatingInputSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const card = await rateCardForUser(c.var.user.id, id, c.req.valid("json"));
      return c.json({ card });
    },
  )
  .patch("/sessions/:id", validate("param", ReviewSessionIdParamSchema), async (c) => {
    return c.json(await endReviewSessionForUser(c.var.user.id, c.req.valid("param").id));
  });
