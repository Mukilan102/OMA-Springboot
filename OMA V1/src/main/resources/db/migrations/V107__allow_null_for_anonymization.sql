-- V107: GDPR data minimization — drop started_at (not needed),
-- and relax NOT NULL on created_at for anonymization.

ALTER TABLE survey_submission DROP COLUMN IF EXISTS started_at;
ALTER TABLE survey_submission ALTER COLUMN created_at DROP NOT NULL;
