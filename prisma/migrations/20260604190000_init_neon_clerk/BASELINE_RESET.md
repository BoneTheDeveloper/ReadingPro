# Baseline Reset

This migration intentionally replaces the previous Supabase/RLS migration
history with one clean Neon + Clerk Prisma baseline before production data is
managed by this branch.

Do not edit applied production migrations after this baseline lands. Future
schema changes must create new migration folders.
