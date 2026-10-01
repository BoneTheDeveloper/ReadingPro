-- Words saved before normalization: apply the same rule the API now applies on
-- every save (trim, collapse whitespace, lowercase), so they match later saves.
UPDATE "VocabularyItem"
SET "term" = lower(regexp_replace(btrim("term"), '\s+', ' ', 'g')),
    "translation" = lower(regexp_replace(btrim("translation"), '\s+', ' ', 'g'))
WHERE "term" <> lower(regexp_replace(btrim("term"), '\s+', ' ', 'g'))
   OR "translation" <> lower(regexp_replace(btrim("translation"), '\s+', ' ', 'g'));
