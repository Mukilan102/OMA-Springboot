-- Remove username column from survey_submission table
ALTER TABLE survey_submission DROP COLUMN IF EXISTS username;

