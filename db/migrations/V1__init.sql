-- Initial schema, owned by Flyway. Columns keep the physical order of the
-- schema this replaced, so schema dumps stay comparable.
--
-- Better Auth tables: "User" (capitalized, Better Auth `user.modelName`),
-- account, session and verification. Every other table is app data owned by a
-- "User". The app's own user settings are extra "User" columns with defaults,
-- so Better Auth's inserts fill them without knowing about them.
--
-- Never edit this file once it has been applied; add V<n>__<name>.sql instead.

-- Enums ----------------------------------------------------------------------

CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

CREATE TYPE "PartOfSpeech" AS ENUM (
    'NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PREPOSITION', 'CONJUNCTION', 'PHRASE', 'OTHER'
);

CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

CREATE TYPE "SourceType" AS ENUM ('TEXT', 'PDF', 'YOUTUBE');

CREATE TYPE "StudioArtifactType" AS ENUM ('QUESTION', 'FLASHCARD');

CREATE TYPE "VocabularyStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- Better Auth tables ---------------------------------------------------------

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tier" TEXT DEFAULT 'FREE',
    -- App settings, not declared to Better Auth.
    "bio" TEXT,
    "desiredRetention" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    -- Optimized FSRS weights; null means the library defaults.
    "fsrsParams" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- App tables -----------------------------------------------------------------

CREATE TABLE "Passage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "cefrLevel" "CEFRLevel",
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "sourceType" "SourceType" NOT NULL,
    "filePath" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "youtubeUrl" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioArtifact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passageId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StudioArtifactType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB,
    "progress" JSONB,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "StudioArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "passageId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VocabularySet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- The set new words land in. One per user; it cannot be deleted.
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    -- New words of this set that may be introduced per user-local day.
    "dailyNewLimit" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "VocabularySet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VocabularyItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    -- term and translation are both normalized: trimmed, whitespace collapsed, lowercased.
    "term" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "partofSpeech" "PartOfSpeech" NOT NULL,
    "savedCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Where the word was first saved; shown on the back of the review card.
    "contextSentence" TEXT,
    -- difficulty, dueAt, lapses, lastReviewAt, learningSteps, reps,
    -- scheduledDays, stability and status are written only by the review
    -- scheduler. Names mirror the ts-fsrs Card type.
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastReviewAt" TIMESTAMPTZ(3),
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "passageId" UUID,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VocabularyStatus" NOT NULL DEFAULT 'NEW',
    -- A word lives in exactly one set; words the user has not filed sit in the default set.
    "vocabularySetId" UUID NOT NULL,

    CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    -- Null means the session covers the due cards of every set.
    "vocabularySetId" UUID,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- One row per rating. status, dueAt, stability, difficulty and learningSteps hold
-- the card state before the rating; scheduledDays is the interval after it.
CREATE TABLE "ReviewLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "vocabularyItemId" UUID NOT NULL,
    "sessionId" UUID,
    -- Sent by the client so a resent rating is not counted twice.
    "clientReviewId" UUID NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "status" "VocabularyStatus" NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "elapsedDays" INTEGER NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "learningSteps" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "reviewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- Indexes --------------------------------------------------------------------

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

CREATE INDEX "Passage_createdAt_idx" ON "Passage"("createdAt");
CREATE UNIQUE INDEX "Passage_filePath_key" ON "Passage"("filePath");
CREATE INDEX "Passage_status_idx" ON "Passage"("status");
CREATE INDEX "Passage_userId_idx" ON "Passage"("userId");

CREATE INDEX "StudioArtifact_passageId_createdAt_idx" ON "StudioArtifact"("passageId", "createdAt" DESC);
CREATE INDEX "StudioArtifact_status_idx" ON "StudioArtifact"("status");
CREATE INDEX "StudioArtifact_userId_createdAt_idx" ON "StudioArtifact"("userId", "createdAt" DESC);

CREATE INDEX "ChatMessage_userId_passageId_createdAt_idx" ON "ChatMessage"("userId", "passageId", "createdAt");

CREATE UNIQUE INDEX "VocabularySet_userId_name_key" ON "VocabularySet"("userId", "name");

CREATE INDEX "VocabularyItem_userId_dueAt_idx" ON "VocabularyItem"("userId", "dueAt");
CREATE INDEX "VocabularyItem_userId_status_idx" ON "VocabularyItem"("userId", "status");
CREATE UNIQUE INDEX "VocabularyItem_userId_term_translation_key" ON "VocabularyItem"("userId", "term", "translation");
CREATE INDEX "VocabularyItem_vocabularySetId_idx" ON "VocabularyItem"("vocabularySetId");

CREATE INDEX "ReviewSession_userId_startedAt_idx" ON "ReviewSession"("userId", "startedAt" DESC);

CREATE UNIQUE INDEX "ReviewLog_clientReviewId_key" ON "ReviewLog"("clientReviewId");
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");
CREATE INDEX "ReviewLog_vocabularyItemId_reviewedAt_idx" ON "ReviewLog"("vocabularyItemId", "reviewedAt");

-- Foreign keys ---------------------------------------------------------------

ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Passage" ADD CONSTRAINT "Passage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioArtifact" ADD CONSTRAINT "StudioArtifact_passageId_fkey"
    FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_passageId_fkey"
    FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VocabularySet" ADD CONSTRAINT "VocabularySet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_passageId_fkey"
    FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- NO ACTION, not RESTRICT: deleting a user removes its sets and words in one
-- statement, which RESTRICT would reject. A set is emptied before it is deleted.
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_vocabularySetId_fkey"
    FOREIGN KEY ("vocabularySetId") REFERENCES "VocabularySet"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_vocabularySetId_fkey"
    FOREIGN KEY ("vocabularySetId") REFERENCES "VocabularySet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_vocabularyItemId_fkey"
    FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ReviewSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
