CREATE TABLE survey_submission (
    session_id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    consent_given BOOLEAN,
    consent_at TIMESTAMPTZ
);