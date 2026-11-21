import { pool, type Queryable } from "@/server/lib/db";

export type ChatRole = "user" | "assistant";

/** The first 40 messages of the conversation, oldest first. */
export async function listChatHistory(
  userId: string,
  passageId: string,
  db: Queryable = pool,
): Promise<{ id: string; role: string; content: string }[]> {
  const { rows } = await db.query<{ id: string; role: string; content: string }>(
    `SELECT "id", "role", "content" FROM "ChatMessage"
     WHERE "userId" = $1 AND "passageId" = $2
     ORDER BY "createdAt" ASC, "id" ASC
     LIMIT 40`,
    [userId, passageId],
  );
  return rows;
}

export async function createChatMessage(
  userId: string,
  passageId: string,
  role: ChatRole,
  content: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO "ChatMessage" ("userId", "passageId", "role", "content") VALUES ($1, $2, $3, $4)`,
    [userId, passageId, role, content],
  );
}

export async function deleteChatHistory(
  userId: string,
  passageId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`DELETE FROM "ChatMessage" WHERE "userId" = $1 AND "passageId" = $2`, [
    userId,
    passageId,
  ]);
}
