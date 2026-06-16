-- Delete any leftover "generating" artifacts from before the atomic-generation
-- model. Under the new model the DB only ever holds completed (done) quizzes;
-- generating state is in-memory only and resets on reload.
DELETE FROM studio_artifacts WHERE status = 'generating';
