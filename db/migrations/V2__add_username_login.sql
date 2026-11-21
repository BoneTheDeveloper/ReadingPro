-- Password sign-in with a username (Better Auth `username` plugin).
--
-- "username" is the normalized (lowercase) login name; "displayUsername" keeps
-- the spelling the user typed. Both stay null for Google-only users, and the
-- unique index allows any number of nulls. Email OTPs use the existing
-- "verification" table and the password hash uses "account"."password", so
-- neither needs a change.

ALTER TABLE "User"
    ADD COLUMN "username" TEXT,
    ADD COLUMN "displayUsername" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
