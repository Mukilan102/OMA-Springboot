-- V108: GDPR consent versioning — store the consent version and a hash
-- of the consent text that was shown to the user at the time of acceptance.

ALTER TABLE survey_submission
    ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20),
    ADD COLUMN IF NOT EXISTS consent_text_hash VARCHAR(64);
