// Passages for tests in other modules, which may not import the passage
// repository directly. The passage is removed with its test user.
import { pool } from "@/server/lib/db";

/** Inserts a COMPLETED text passage for `userId` and returns its id. */
export async function createTestPassage(userId: string, content = "A short test passage."): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "Passage" ("userId", "title", "content", "sourceType", "status", "wordCount")
     VALUES ($1, 'Test passage', $2, 'TEXT', 'COMPLETED', $3)
     RETURNING "id"`,
    [userId, content, content.split(/\s+/).filter(Boolean).length],
  );
  return rows[0].id;
}
