-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Users: read/update own profile (match via supabaseAuthId = auth UUID)
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING ("supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING ("supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'));

-- Passages: CRUD on own passages
CREATE POLICY "Users can CRUD own passages" ON passages
  FOR ALL USING (
    "userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
  );

-- Questions: access via passage ownership
CREATE POLICY "Users can read own questions" ON questions
  FOR SELECT USING (
    "passageId" IN (
      SELECT p.id FROM passages p
      JOIN users u ON u.id = p."userId"
      WHERE u."supabaseAuthId" = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert own questions" ON questions
  FOR INSERT WITH CHECK (
    "passageId" IN (
      SELECT p.id FROM passages p
      JOIN users u ON u.id = p."userId"
      WHERE u."supabaseAuthId" = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update own questions" ON questions
  FOR UPDATE USING (
    "passageId" IN (
      SELECT p.id FROM passages p
      JOIN users u ON u.id = p."userId"
      WHERE u."supabaseAuthId" = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can delete own questions" ON questions
  FOR DELETE USING (
    "passageId" IN (
      SELECT p.id FROM passages p
      JOIN users u ON u.id = p."userId"
      WHERE u."supabaseAuthId" = (SELECT auth.jwt() ->> 'sub')
    )
  );

-- Card Reviews: CRUD on own reviews
CREATE POLICY "Users can CRUD own card reviews" ON card_reviews
  FOR ALL USING (
    "userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
  );

-- Study Sessions: CRUD on own sessions
CREATE POLICY "Users can CRUD own study sessions" ON study_sessions
  FOR ALL USING (
    "userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
  );
