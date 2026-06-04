# Prisma Baseline, RLS, and Dictionary Source-of-Truth Reset

**Date**: 2026-06-04 10:45
**Severity**: Critical
**Component**: Database Architecture & Dictionary Management
**Status**: Resolved

## What Happened

Completed a comprehensive database and dictionary modernization, replacing 5 incremental Prisma migrations with a clean baseline migration, implementing complete RLS coverage across all 15 public tables, and normalizing the monolithic 34K-line dictionary source into a normalized file structure with 4 cross-referenced JSON files.

## The Brutal Truth

This was a massive undertaking that required complete database restructuring. The complexity of maintaining backward compatibility while implementing UUID-native migrations and RLS for all tables was intense. The dictionary normalization involved untangling 1009 entries with complex relationships across a single monolithic file - it felt like defusing a bomb made of spaghetti code. The relief of seeing all 262 tests pass after this refactor was immense, but the hours spent on migration planning and verification were brutal.

## Technical Details

- **Migration Cleanup**: Replaced 5 incremental migrations (00002_*.sql) with single clean baseline (00000000_init)
- **UUID Native**: All tables now use native UUID types from inception, eliminating conversion pain points
- **RLS Expansion**: Added policies for 9 additional tables (study_chat_messages, translation_caches, translation_histories, vocabulary_items), bringing total coverage to 15 public tables
- **Dictionary Split**: Broke 34K-line common-1000.json (1009 entries) into entries.json, senses.json, translations.json, aliases.json with stable cross-file reference keys
- **Script Modernization**: Replaced prisma/seed-dictionary.ts with prisma/seed.ts and created 4 new helper scripts: normalize-dictionary.ts, validate-dictionary.ts, generate-seed-data.ts, import-dictionary.ts
- **Supabase Cleanup**: Deleted entire supabase/migrations/ directory, kept only config.toml for hosting

## What We Tried

Multiple approaches were considered for the migration:
1. Attempted to maintain existing migration structure but hit UUID conversion complexity
2. Considered gradual rollout but RLS dependencies required full table coverage
3. Dictionary normalization required multiple approaches before settling on cross-file key stability

## Root Cause Analysis

The root cause was architectural debt from early development phases:
- Incremental migrations created UUID conversion nightmares
- RLS was incomplete, leaving 9 public tables unprotected
- Dictionary source-of-truth became unmaintainable monolith
- Mixed database tooling (Prisma + raw SQL migrations) created confusion

## Lessons Learned

1. **Always start with UUID-native tables** - conversion pain is not worth the perceived simplicity of incrementals
2. **RLS is all-or-nothing** - partial coverage creates false security and complex dependency chains
3. **Dictionary data structure matters** - monolithic JSON files with 1000+ entries become unmaintainable
4. **Tooling consistency is critical** - mixing Prisma with raw SQL migrations creates friction and confusion
5. **Seed script complexity requires separation** - dictionary processing, validation, and seeding should be distinct concerns

## Next Steps

- Unblocked plan 260604-1045-issue-46-legacy-input-runtime-fixes
- Unblocked plan 260604-1102-issue-46-output-boundary-migration  
- Monitor performance of new dictionary loading structure
- Document new RLS policies and dictionary schema for future developers
- Evaluate if any remaining Supabase-specific configurations can be moved to Prisma