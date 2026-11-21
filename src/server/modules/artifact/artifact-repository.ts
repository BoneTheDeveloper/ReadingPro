import { pool, type JsonValue, type Queryable } from "@/server/lib/db";
import type { ProcessingStatus, StudioArtifactType } from "@/shared/enums";

type ArtifactRow = {
  id: string;
  passageId: string;
  userId: string;
  type: StudioArtifactType;
  createdAt: Date;
  content: unknown;
  progress: unknown;
  status: ProcessingStatus;
};

type ArtifactListRow = Omit<ArtifactRow, "userId" | "content">;
export type ArtifactDetailRow = Omit<ArtifactRow, "userId">;

const ARTIFACT_COLUMNS = `"id", "passageId", "userId", "type", "createdAt", "content", "progress", "status"`;

/** `undefined` stays SQL NULL, so a `COALESCE` keeps the stored value. */
function toJsonb(value: JsonValue | object | undefined): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

export async function listArtifactsForUser(
  userId: string,
  passageId: string,
  db: Queryable = pool,
): Promise<ArtifactListRow[]> {
  const { rows } = await db.query<ArtifactListRow>(
    `SELECT "id", "passageId", "type", "createdAt", "progress", "status"
     FROM "StudioArtifact"
     WHERE "passageId" = $1 AND "userId" = $2
     ORDER BY "createdAt" DESC`,
    [passageId, userId],
  );
  return rows;
}

export async function findArtifactForUser(
  id: string,
  userId: string,
  db: Queryable = pool,
): Promise<ArtifactDetailRow | null> {
  const { rows } = await db.query<ArtifactDetailRow>(
    `SELECT "id", "passageId", "type", "content", "progress", "createdAt", "status"
     FROM "StudioArtifact" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** Without `status` the artifact is COMPLETED; without `content` it stores SQL NULL. */
export async function createArtifact(
  input: {
    passageId: string;
    userId: string;
    type: StudioArtifactType;
    content?: JsonValue | object;
    status?: ProcessingStatus;
  },
  db: Queryable = pool,
): Promise<ArtifactRow> {
  const { rows } = await db.query<ArtifactRow>(
    `INSERT INTO "StudioArtifact" ("passageId", "userId", "type", "content", "status")
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING ${ARTIFACT_COLUMNS}`,
    [input.passageId, input.userId, input.type, toJsonb(input.content), input.status ?? "COMPLETED"],
  );
  return rows[0];
}

/** Without `content` the stored content is kept. Null when the user owns no such artifact. */
export async function updateArtifactStatus(
  args: {
    id: string;
    userId: string;
    status: ProcessingStatus;
    content?: JsonValue | object;
  },
  db: Queryable = pool,
): Promise<ArtifactRow | null> {
  const { rows } = await db.query<ArtifactRow>(
    `UPDATE "StudioArtifact"
     SET "status" = $3, "content" = COALESCE($4::jsonb, "content")
     WHERE "id" = $1 AND "userId" = $2
     RETURNING ${ARTIFACT_COLUMNS}`,
    [args.id, args.userId, args.status, toJsonb(args.content)],
  );
  return rows[0] ?? null;
}

/** False when the user owns no artifact with this id. */
export async function deleteArtifact(
  id: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM "StudioArtifact" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rowCount === 1;
}

/** Null when the user owns no artifact with this id. */
export async function updateArtifactProgress(
  id: string,
  userId: string,
  progress: JsonValue | object,
  db: Queryable = pool,
): Promise<{ id: string } | null> {
  const { rows } = await db.query<{ id: string }>(
    `UPDATE "StudioArtifact" SET "progress" = $3::jsonb
     WHERE "id" = $1 AND "userId" = $2
     RETURNING "id"`,
    [id, userId, JSON.stringify(progress)],
  );
  return rows[0] ?? null;
}
