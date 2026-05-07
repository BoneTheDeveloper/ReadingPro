-- NOTE: Prisma connects via service role and bypasses RLS.
-- App-level auth (requireAuth) is the primary authorization layer.
-- RLS is kept enabled as defense-in-depth for direct Supabase client queries.
-- See prisma/SECURITY.md for details.

-- Enable RLS on all tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can read own profile" ON "profiles"
  FOR SELECT USING ("id" = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON "profiles"
  FOR UPDATE USING ("id" = auth.uid()::text);

-- Passages: direct UUID comparison
CREATE POLICY "Users can CRUD own passages" ON passages
  FOR ALL USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Questions: via passage ownership
CREATE POLICY "Users can read own questions" ON questions
  FOR SELECT USING (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "Users can insert own questions" ON questions
  FOR INSERT WITH CHECK (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "Users can update own questions" ON questions
  FOR UPDATE USING (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "Users can delete own questions" ON questions
  FOR DELETE USING (
    "passageId" IN (SELECT id FROM passages WHERE "userId" = auth.uid()::text)
  );

-- Card Reviews: direct UUID comparison
CREATE POLICY "Users can CRUD own card reviews" ON card_reviews
  FOR ALL USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Study Sessions: direct UUID comparison
CREATE POLICY "Users can CRUD own study sessions" ON study_sessions
  FOR ALL USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

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
