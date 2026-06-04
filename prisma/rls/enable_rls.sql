-- NOTE: Prisma connects via service role and bypasses RLS.
-- App-level auth (requireAuth) is the primary authorization layer.
-- RLS is kept enabled as defense-in-depth for direct Supabase client queries.
-- See prisma/SECURITY.md for details.

-- Enable RLS on all tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "card_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "translation_caches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "translation_histories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vocabulary_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dictionary_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dictionary_senses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dictionary_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dictionary_aliases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dictionary_source_audits" ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can read own profile" ON "profiles"
  FOR SELECT USING ("id" = auth.uid());

CREATE POLICY "Users can update own profile" ON "profiles"
  FOR UPDATE USING ("id" = auth.uid());

-- Passages: direct UUID comparison
CREATE POLICY "Users can CRUD own passages" ON "passages"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Study chat messages: direct UUID comparison
CREATE POLICY "Users can CRUD own chat messages" ON "study_chat_messages"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Questions: via passage ownership
CREATE POLICY "Users can read own questions" ON "questions"
  FOR SELECT USING (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid())
  );

CREATE POLICY "Users can insert own questions" ON "questions"
  FOR INSERT WITH CHECK (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid())
  );

CREATE POLICY "Users can update own questions" ON "questions"
  FOR UPDATE USING (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid())
  );

CREATE POLICY "Users can delete own questions" ON "questions"
  FOR DELETE USING (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid())
  );

-- Card Reviews: direct UUID comparison
CREATE POLICY "Users can CRUD own card reviews" ON "card_reviews"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Study Sessions: direct UUID comparison
CREATE POLICY "Users can CRUD own study sessions" ON "study_sessions"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Translation caches: direct UUID comparison
CREATE POLICY "Users can CRUD own translation caches" ON "translation_caches"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Translation histories: direct UUID comparison
CREATE POLICY "Users can CRUD own translation histories" ON "translation_histories"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Vocabulary items: direct UUID comparison
CREATE POLICY "Users can CRUD own vocabulary items" ON "vocabulary_items"
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Dictionary and audit tables: RLS enabled but server-only (no public policies).
-- Prisma bypasses RLS via service role; direct Supabase client access is denied by default.

-- Auto-create profile trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."profiles" ("id", "email", "name", "avatarUrl", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
