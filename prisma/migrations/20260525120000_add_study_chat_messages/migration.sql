CREATE TABLE "study_chat_messages" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passageId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "study_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "study_chat_messages_userId_passageId_createdAt_idx"
  ON "study_chat_messages"("userId", "passageId", "createdAt");

ALTER TABLE "study_chat_messages"
  ADD CONSTRAINT "study_chat_messages_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_chat_messages"
  ADD CONSTRAINT "study_chat_messages_passageId_fkey"
  FOREIGN KEY ("passageId") REFERENCES "passages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
